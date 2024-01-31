import { BigNumber } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import useSWRImmutable from 'swr/immutable'
import * as Sentry from '@sentry/react'
import { useInterval } from 'react-use'

import { getCctpUtils } from '@/token-bridge-sdk/cctp'
import {
  ChainId,
  getBlockTime,
  getNetworkName,
  isNetwork
} from '../util/networks'
import { fetchCCTPDeposits, fetchCCTPWithdrawals } from '../util/cctp/fetchCCTP'
import { DepositStatus, MergedTransaction, WithdrawalStatus } from './app/state'
import { getStandardizedTimestamp } from './app/utils'
import { useAccount, useSigner } from 'wagmi'
import dayjs from 'dayjs'
import {
  ChainDomain,
  CompletedCCTPTransfer,
  PendingCCTPTransfer,
  Response
} from '../pages/api/cctp/[type]'
import { CommonAddress } from '../util/CommonAddressUtils'
import { trackEvent } from '../util/AnalyticsUtils'
import { useAccountType } from '../hooks/useAccountType'
import { AssetType } from '../hooks/arbTokenBridge.types'
import { useTransactionHistory } from '../hooks/useTransactionHistory'
import { Address } from '../util/AddressUtils'

// see https://developers.circle.com/stablecoin/docs/cctp-technical-reference#block-confirmations-for-attestations
// Blocks need to be awaited on the L1 whether it's a deposit or a withdrawal
export function getBlockBeforeConfirmation(chainId: ChainId) {
  const { isTestnet } = isNetwork(chainId)
  // Required blocks are 65 (mainnet) and 5 (testnet), we're adding a buffer of ~30%
  return isTestnet ? 7 : 85
}

export type CCTPSupportedChainId =
  | ChainId.Ethereum
  | ChainId.Sepolia
  | ChainId.ArbitrumOne
  | ChainId.ArbitrumSepolia

function getSourceChainIdFromSourceDomain(
  sourceDomain: ChainDomain,
  chainId: ChainId
): CCTPSupportedChainId {
  const { isTestnet } = isNetwork(chainId)

  // Deposits
  if (sourceDomain === ChainDomain.Ethereum) {
    return isTestnet ? ChainId.Sepolia : ChainId.Ethereum
  }

  // Withdrawals
  return isTestnet ? ChainId.ArbitrumSepolia : ChainId.ArbitrumOne
}

function getDestinationChainIdFromSourceDomain(
  sourceDomain: ChainDomain,
  chainId: ChainId
): CCTPSupportedChainId {
  const { isTestnet } = isNetwork(chainId)

  // Deposits
  if (sourceDomain === ChainDomain.Ethereum) {
    return isTestnet ? ChainId.ArbitrumSepolia : ChainId.ArbitrumOne
  }

  // Withdrawals
  return isTestnet ? ChainId.Sepolia : ChainId.Ethereum
}

export function getUSDCAddresses(chainId: CCTPSupportedChainId) {
  return {
    [ChainId.Ethereum]: CommonAddress.Ethereum,
    [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne,
    [ChainId.Sepolia]: CommonAddress.Sepolia,
    [ChainId.ArbitrumSepolia]: CommonAddress.ArbitrumSepolia
  }[chainId]
}

export function getUsdcTokenAddressFromSourceChainId(
  sourceChainId: CCTPSupportedChainId
) {
  return getUSDCAddresses(sourceChainId).USDC
}

function parseTransferToMergedTransaction(
  transfer: PendingCCTPTransfer | CompletedCCTPTransfer,
  chainId: ChainId
): MergedTransaction {
  const { messageSent } = transfer
  let status = 'Unconfirmed'
  let resolvedAt = null
  let receiveMessageTransactionHash = null

  if ('messageReceived' in transfer) {
    const { messageReceived } = transfer
    status = 'Executed'
    resolvedAt = getStandardizedTimestamp(
      (parseInt(messageReceived.blockTimestamp, 10) * 1_000).toString()
    )
    receiveMessageTransactionHash = messageReceived.transactionHash
  }
  const sourceChainId = getSourceChainIdFromSourceDomain(
    parseInt(messageSent.sourceDomain, 10),
    chainId
  )
  const destinationChainId = getDestinationChainIdFromSourceDomain(
    parseInt(messageSent.sourceDomain, 10),
    chainId
  )
  const isDeposit =
    parseInt(messageSent.sourceDomain, 10) === ChainDomain.Ethereum

  return {
    sender: messageSent.sender,
    destination: messageSent.recipient,
    direction: isDeposit ? 'deposit' : 'withdraw',
    status,
    createdAt: getStandardizedTimestamp(
      (parseInt(messageSent.blockTimestamp, 10) * 1_000).toString()
    ),
    resolvedAt,
    txId: messageSent.transactionHash,
    asset: 'USDC',
    assetType: AssetType.ERC20,
    value: messageSent.amount,
    uniqueId: null,
    isWithdrawal: !isDeposit,
    blockNum: parseInt(messageSent.blockNumber, 10),
    tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChainId),
    depositStatus: DepositStatus.CCTP_DEFAULT_STATE,
    isCctp: true,
    parentChainId: isDeposit ? sourceChainId : destinationChainId,
    childChainId: isDeposit ? destinationChainId : sourceChainId,
    sourceChainId,
    destinationChainId,
    cctpData: {
      sourceChainId,
      attestationHash: messageSent.attestationHash,
      messageBytes: messageSent.message,
      receiveMessageTransactionHash,
      receiveMessageTimestamp: resolvedAt || null
    }
  }
}

type ParsedResponse = {
  pending: MergedTransaction[]
  completed: MergedTransaction[]
}
function parseSWRResponse(
  { pending, completed }: Response['data'],
  chainId: ChainId
): ParsedResponse {
  return {
    pending: pending.map(pendingDeposit =>
      parseTransferToMergedTransaction(pendingDeposit, chainId)
    ),
    completed: completed.map(completedDeposit =>
      parseTransferToMergedTransaction(completedDeposit, chainId)
    )
  }
}

type fetchCctpParams = {
  walletAddress?: string
  l1ChainId: ChainId
  pageNumber: number
  pageSize: number
  enabled: boolean
}
export const useCCTPDeposits = ({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  enabled
}: fetchCctpParams) => {
  return useSWRImmutable(
    // Only fetch when we have walletAddress
    () => {
      if (!walletAddress || !enabled) {
        return null
      }

      return [walletAddress, l1ChainId, pageNumber, pageSize, 'cctp-deposits']
    },
    ([_walletAddress, _l1ChainId, _pageNumber, _pageSize]) =>
      fetchCCTPDeposits({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId,
        pageNumber: _pageNumber,
        pageSize: _pageSize
      })
        .then(deposits => parseSWRResponse(deposits, _l1ChainId))
        .then(deposits => {
          return {
            completed: deposits.completed,
            pending: deposits.pending.map(tx => {
              return {
                ...tx,
                status: isTransferConfirmed(tx) ? 'Confirmed' : tx.status
              }
            })
          }
        })
  )
}

export const useCCTPWithdrawals = ({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  enabled
}: fetchCctpParams) => {
  return useSWRImmutable(
    // Only fetch when we have walletAddress
    () => {
      if (!walletAddress || !enabled) {
        return null
      }

      return [
        walletAddress,
        l1ChainId,
        pageNumber,
        pageSize,
        'cctp-withdrawals'
      ]
    },
    ([_walletAddress, _l1ChainId, _pageNumber, _pageSize]) =>
      fetchCCTPWithdrawals({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId,
        pageNumber: _pageNumber,
        pageSize: _pageSize
      })
        .then(withdrawals => parseSWRResponse(withdrawals, _l1ChainId))
        .then(withdrawals => {
          return {
            completed: withdrawals.completed,
            pending: withdrawals.pending.map(tx => {
              return {
                ...tx,
                status: isTransferConfirmed(tx) ? 'Confirmed' : tx.status
              }
            })
          }
        })
  )
}

type PartialMergedTransaction = Partial<Omit<MergedTransaction, 'cctpData'>> & {
  txId: MergedTransaction['txId']
  cctpData?: Partial<MergedTransaction['cctpData']>
}
type CctpStore = {
  transfers: { [id: string]: MergedTransaction }
  transfersIds: string[]
  setTransfers: (transfers: {
    pending: MergedTransaction[]
    completed: MergedTransaction[]
  }) => void
  resetTransfers: () => void
  updateTransfer: (transfer: PartialMergedTransaction) => void
}

const useCctpStore = create<CctpStore>((set, get) => ({
  transfers: {},
  transfersIds: [],
  resetTransfers: () => {
    return set({
      transfers: {},
      transfersIds: []
    })
  },
  setTransfers: transfers => {
    const { pending, completed } = transfers

    const previousTransfersMap = get().transfers

    const transactions = [...pending, ...completed]
      .concat(Object.values(previousTransfersMap))
      .sort((t1, t2) => (dayjs(t2.createdAt).isAfter(t1.createdAt) ? 1 : -1))

    const ids = new Set<string>()
    const transfersMap = transactions.reduce(
      (acc, transaction) => {
        acc[transaction.txId] = transaction
        ids.add(transaction.txId)
        return acc
      },
      {} as {
        [txId: string]: MergedTransaction
      }
    )

    return set({
      transfers: transfersMap,
      transfersIds: [...ids]
    })
  },
  updateTransfer: transfer => {
    const prevTransfer = get().transfers[transfer.txId]
    if (!prevTransfer) {
      return
    }

    set(prevState => ({
      transfers: {
        ...prevState.transfers,
        [transfer.txId]: {
          ...prevTransfer,
          ...transfer,
          cctpData: {
            ...prevTransfer.cctpData,
            ...transfer.cctpData
          }
        } as MergedTransaction
      }
    }))
  }
}))

export function useCctpState() {
  const {
    transfersIds,
    transfers,
    resetTransfers,
    setTransfers,
    updateTransfer
  } = useCctpStore()

  const { pendingIds, completedIds, depositIds, withdrawalIds } =
    useMemo(() => {
      return transfersIds.reduce(
        (acc, id) => {
          const transfer = transfers[id]
          if (!transfer) {
            return acc
          }

          if (transfer.direction === 'deposit') {
            acc.depositIds.push(id)
          } else {
            acc.withdrawalIds.push(id)
          }
          if (transfer.status !== 'Executed') {
            acc.pendingIds.push(id)
          } else {
            acc.completedIds.push(id)
          }

          return acc
        },
        {
          pendingIds: [] as string[],
          completedIds: [] as string[],
          depositIds: [] as string[],
          withdrawalIds: [] as string[]
        }
      )
    }, [transfersIds, transfers])

  return {
    resetTransfers,
    setTransfers,
    transfersIds,
    transfers,
    pendingIds,
    completedIds,
    depositIds,
    withdrawalIds,
    updateTransfer
  }
}

type useCctpFetchingParams = {
  l1ChainId: ChainId
  l2ChainId: ChainId
  walletAddress: Address | undefined
  pageSize: number
  pageNumber: number
  type: 'deposits' | 'withdrawals' | 'all'
}
export function useCctpFetching({
  l1ChainId,
  l2ChainId,
  walletAddress,
  pageSize = 10,
  pageNumber,
  type
}: useCctpFetchingParams) {
  const { isEthereumMainnet: isL1Ethereum, isSepolia: isL1Sepolia } =
    isNetwork(l1ChainId)
  const {
    isArbitrumOne: isL2ArbitrumOne,
    isArbitrumSepolia: isL2ArbitrumSepolia
  } = isNetwork(l2ChainId)
  const isValidChainPair =
    (isL1Ethereum && isL2ArbitrumOne) || (isL1Sepolia && isL2ArbitrumSepolia)

  const {
    data: deposits,
    isLoading: isLoadingDeposits,
    error: depositsError,
    mutate: mutateDeposits
  } = useCCTPDeposits({
    l1ChainId,
    walletAddress,
    pageNumber,
    pageSize,
    enabled: type !== 'withdrawals' && isValidChainPair
  })

  const {
    data: withdrawals,
    isLoading: isLoadingWithdrawals,
    error: withdrawalsError,
    mutate: mutateWithdrawals
  } = useCCTPWithdrawals({
    l1ChainId,
    walletAddress,
    pageNumber,
    pageSize,
    enabled: type !== 'deposits' && isValidChainPair
  })
  const { setTransfers } = useCctpState()

  useEffect(() => {
    if (deposits) {
      setTransfers(deposits)
    }
  }, [deposits, setTransfers])

  useEffect(() => {
    if (withdrawals) {
      setTransfers(withdrawals)
    }
  }, [withdrawals, setTransfers])

  const setPendingTransfer = useCallback(
    (transfer: PartialMergedTransaction, type: 'deposit' | 'withdrawal') => {
      const mutate = type === 'deposit' ? mutateDeposits : mutateWithdrawals
      mutate(
        {
          pending: [transfer as MergedTransaction],
          completed: []
        },
        {
          populateCache(result: ParsedResponse, currentData) {
            const transfer = result.pending[0]
            if (!currentData || !transfer) {
              return result
            }
            const index = currentData.pending.findIndex(
              tx => tx.txId === transfer.txId
            )
            const existingTransfer = currentData.pending[index]
            if (existingTransfer) {
              const { cctpData, ...txData } = existingTransfer
              const { cctpData: resultCctpData, ...resultTxData } = transfer

              currentData.pending[index] = {
                ...txData,
                ...resultTxData,
                cctpData: {
                  ...cctpData,
                  ...resultCctpData
                }
              }

              return currentData
            }

            return {
              pending: [...result.pending, ...currentData.pending],
              completed: [...result.completed, ...currentData.completed]
            }
          },
          revalidate: false
        }
      )
    },
    [mutateDeposits, mutateWithdrawals]
  )

  return {
    deposits,
    withdrawals,
    isLoadingDeposits,
    isLoadingWithdrawals,
    depositsError,
    withdrawalsError,
    mutateDeposits,
    mutateWithdrawals,
    setPendingTransfer
  }
}

export function useClaimCctp(tx: MergedTransaction) {
  const { address } = useAccount()
  const { updatePendingTransaction } = useTransactionHistory(address)
  const [isClaiming, setIsClaiming] = useState(false)
  const { waitForAttestation, receiveMessage } = getCctpUtils({
    sourceChainId: tx.cctpData?.sourceChainId
  })
  const { isSmartContractWallet } = useAccountType()

  const { data: signer } = useSigner({
    chainId: tx.destinationChainId
  })

  const claim = useCallback(async () => {
    if (!tx.cctpData?.attestationHash || !tx.cctpData.messageBytes || !signer) {
      return
    }

    setIsClaiming(true)
    try {
      const attestation = await waitForAttestation(tx.cctpData.attestationHash)
      const receiveTx = await receiveMessage({
        attestation,
        messageBytes: tx.cctpData.messageBytes as Address,
        signer
      })
      const receiveReceiptTx = await receiveTx.wait()

      const resolvedAt =
        receiveReceiptTx.status === 1
          ? getStandardizedTimestamp(BigNumber.from(Date.now()).toString())
          : null
      updatePendingTransaction({
        ...tx,
        resolvedAt,
        depositStatus: tx.isWithdrawal ? undefined : DepositStatus.L2_SUCCESS,
        status: WithdrawalStatus.EXECUTED,
        cctpData: {
          ...tx.cctpData,
          receiveMessageTimestamp: resolvedAt,
          receiveMessageTransactionHash:
            receiveReceiptTx.status === 1
              ? (receiveReceiptTx.transactionHash as Address)
              : null
        }
      })

      const targetChainId = getTargetChainIdFromSourceChain(tx)
      const currentNetworkName = getNetworkName(targetChainId)
      const { isEthereumMainnetOrTestnet } = isNetwork(targetChainId)

      trackEvent(
        isEthereumMainnetOrTestnet ? 'CCTP Withdrawal' : 'CCTP Deposit',
        {
          accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
          network: currentNetworkName,
          amount: Number(tx.value),
          complete: true
        }
      )

      if (receiveReceiptTx.status === 0) {
        throw new Error('Transaction failed')
      }
    } catch (e) {
      Sentry.captureException(e)
      throw e
    } finally {
      setIsClaiming(false)
    }
  }, [
    isSmartContractWallet,
    receiveMessage,
    signer,
    tx,
    updatePendingTransaction,
    waitForAttestation
  ])

  return {
    isClaiming,
    claim
  }
}

export function getTargetChainIdFromSourceChain(tx: MergedTransaction) {
  if (!tx.cctpData?.sourceChainId) {
    return ChainId.Ethereum
  }

  return {
    [ChainId.Ethereum]: ChainId.ArbitrumOne,
    [ChainId.Sepolia]: ChainId.ArbitrumSepolia,
    [ChainId.ArbitrumOne]: ChainId.Ethereum,
    [ChainId.ArbitrumSepolia]: ChainId.Sepolia
  }[tx.cctpData.sourceChainId]
}

function getConfirmedDate(tx: MergedTransaction) {
  const requiredL1BlocksBeforeConfirmation = getBlockBeforeConfirmation(
    tx.parentChainId
  )
  const blockTime = getBlockTime(tx.parentChainId)

  return dayjs(tx.createdAt).add(
    requiredL1BlocksBeforeConfirmation * blockTime,
    'seconds'
  )
}

export function isTransferConfirmed(tx: MergedTransaction) {
  return dayjs().isAfter(getConfirmedDate(tx))
}

export function useRemainingTime(tx: MergedTransaction) {
  const [remainingTime, setRemainingTime] = useState<string>('Calculating...')
  const [canBeClaimedDate, setCanBeClaimedDate] = useState<dayjs.Dayjs>()
  const [isConfirmed, setIsConfirmed] = useState(
    tx.status === 'Confirmed' || tx.status === 'Executed'
  )

  useEffect(() => {
    if (tx.status === 'Failure') {
      setRemainingTime('')
    }
  }, [tx.status, setRemainingTime])

  useEffect(() => {
    if (!tx.createdAt || tx.status === 'Failure') {
      return
    }

    setCanBeClaimedDate(getConfirmedDate(tx))
  }, [tx])

  useInterval(() => {
    if (!canBeClaimedDate) {
      return
    }

    if (isTransferConfirmed(tx)) {
      setIsConfirmed(true)
    } else {
      setRemainingTime(canBeClaimedDate.fromNow(true).toString())
    }
  }, 2000)

  return {
    remainingTime,
    isConfirmed
  }
}
