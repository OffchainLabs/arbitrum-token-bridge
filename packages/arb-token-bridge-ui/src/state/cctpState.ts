import { BigNumber } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import useSWRImmutable from 'swr/immutable'
import * as Sentry from '@sentry/react'
import { useInterval } from 'react-use'

import { useCCTP } from '../hooks/CCTP/useCCTP'
import {
  ChainId,
  getBlockTime,
  getNetworkName,
  isNetwork
} from '../util/networks'
import { fetchCCTPDeposits, fetchCCTPWithdrawals } from '../util/cctp/fetchCCTP'
import { DepositStatus, MergedTransaction } from './app/state'
import { getStandardizedTimestamp } from './app/utils'
import { useSigner } from 'wagmi'
import dayjs from 'dayjs'
import {
  ChainDomain,
  CompletedCCTPTransfer,
  PendingCCTPTransfer,
  Response
} from '../pages/api/cctp/[type]'
import { CommonAddress } from '../util/CommonAddressUtils'
import { shouldTrackAnalytics, trackEvent } from '../util/AnalyticsUtils'
import { useAccountType } from '../hooks/useAccountType'
import { useNetworksAndSigners } from '../hooks/useNetworksAndSigners'
import { getAttestationHashAndMessageFromReceipt } from '../util/cctp/getAttestationHashAndMessageFromReceipt'

// see https://developers.circle.com/stablecoin/docs/cctp-technical-reference#block-confirmations-for-attestations
// Blocks need to be awaited on the L1 whether it's a deposit or a withdrawal
export function getBlockBeforeConfirmation(chainId: ChainId) {
  const { isTestnet } = isNetwork(chainId)
  // Required blocks are 65 (mainnet) and 5 (testnet), we're adding a buffer of ~30%
  return isTestnet ? 7 : 85
}

export type CCTPSupportedChainId =
  | ChainId.Mainnet
  | ChainId.Goerli
  | ChainId.ArbitrumOne
  | ChainId.ArbitrumGoerli

function getSourceChainIdFromSourceDomain(
  sourceDomain: ChainDomain,
  chainId: ChainId
): CCTPSupportedChainId {
  const { isTestnet } = isNetwork(chainId)

  // Deposits
  if (sourceDomain === ChainDomain.Mainnet) {
    return isTestnet ? ChainId.Goerli : ChainId.Mainnet
  }

  // Withdrawals
  return isTestnet ? ChainId.ArbitrumGoerli : ChainId.ArbitrumOne
}

export function getUSDCAddresses(chainId: CCTPSupportedChainId) {
  return {
    [ChainId.Mainnet]: CommonAddress.Mainnet,
    [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne,
    [ChainId.Goerli]: CommonAddress.Goerli,
    [ChainId.ArbitrumGoerli]: CommonAddress.ArbitrumGoerli
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
  const isDeposit =
    parseInt(messageSent.sourceDomain, 10) === ChainDomain.Mainnet

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
    value: messageSent.amount,
    uniqueId: null,
    isWithdrawal: !isDeposit,
    blockNum: parseInt(messageSent.blockNumber, 10),
    tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChainId),
    depositStatus: DepositStatus.CCTP_DEFAULT_STATE,
    isCctp: true,
    cctpData: {
      sourceChainId,
      attestationHash: messageSent.attestationHash,
      messageBytes: messageSent.message,
      receiveMessageTransactionHash,
      receiveMessageTimestamp: resolvedAt || null
    }
  }
}

function parseSWRResponse(
  { pending, completed }: Response['data'],
  chainId: ChainId
): {
  pending: MergedTransaction[]
  completed: MergedTransaction[]
} {
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
      }).then(deposits => parseSWRResponse(deposits, _l1ChainId))
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
      }).then(withdrawals => parseSWRResponse(withdrawals, _l1ChainId))
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

export function useUpdateCctpTransactions() {
  const { pendingIds, transfers, updateTransfer } = useCctpState()
  const {
    l1: { provider: l1Provider },
    l2: { provider: l2Provider }
  } = useNetworksAndSigners()
  const getTransactionReceipt = useCallback(
    async (tx: MergedTransaction) => {
      const provider = tx.direction === 'deposit' ? l1Provider : l2Provider
      const receipt = await provider.getTransactionReceipt(tx.txId)

      return {
        receipt,
        tx
      }
    },
    [l1Provider, l2Provider]
  )

  const pendingTransactions = useMemo(() => {
    return pendingIds
      .map(pendingId => transfers[pendingId])
      .filter(transfer => transfer) as unknown as MergedTransaction[]
  }, [pendingIds, transfers])

  const updateCctpTransactions = useCallback(async () => {
    const receipts = await Promise.all(
      pendingTransactions.map(getTransactionReceipt)
    )
    const now = dayjs()
    receipts.forEach(({ receipt, tx }) => {
      if (!receipt) {
        return
      }

      const l1SourceChain = getL1ChainIdFromSourceChain(tx)
      const requiredL1BlocksBeforeConfirmation =
        getBlockBeforeConfirmation(l1SourceChain)
      const blockTime = getBlockTime(l1SourceChain)

      if (receipt.status === 0) {
        updateTransfer({
          txId: receipt.transactionHash,
          status: 'Failure'
        })
      } else if (tx.cctpData?.receiveMessageTransactionHash) {
        updateTransfer({
          txId: receipt.transactionHash,
          status: 'Executed'
        })
      } else if (receipt.blockNumber && !tx.blockNum) {
        // If blockNumber was never set (for example, network switch just after the deposit)
        const { messageBytes, attestationHash } =
          getAttestationHashAndMessageFromReceipt(receipt)
        updateTransfer({
          txId: receipt.transactionHash,
          blockNum: receipt.blockNumber,
          cctpData: {
            messageBytes,
            attestationHash
          }
        })
      } else if (
        tx.createdAt &&
        now.diff(tx.createdAt, 'second') >
          requiredL1BlocksBeforeConfirmation * blockTime
      ) {
        // If transaction claim was set to failure, don't reset to Confirmed
        if (tx.status === 'Failure') {
          return
        }

        updateTransfer({
          txId: receipt.transactionHash,
          status: 'Confirmed'
        })
      }
    })
  }, [getTransactionReceipt, pendingTransactions, updateTransfer])

  return { updateCctpTransactions }
}

type useCctpFetchingParams = {
  l1ChainId: ChainId
  l2ChainId: ChainId
  walletAddress: `0x${string}` | undefined
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
  const { isMainnet: isL1Mainnet, isGoerli: isL1Goerli } = isNetwork(l1ChainId)
  const {
    isArbitrumOne: isL2ArbitrumOne,
    isArbitrumGoerli: isL2ArbitrumGoerli
  } = isNetwork(l2ChainId)
  const isValidChainPair =
    (isL1Mainnet && isL2ArbitrumOne) || (isL1Goerli && isL2ArbitrumGoerli)

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
    (transfer: PartialMergedTransaction, isDeposit: boolean) => {
      const mutate = isDeposit ? mutateDeposits : mutateWithdrawals
      mutate(
        {
          pending: [transfer as MergedTransaction],
          completed: []
        },
        {
          populateCache(result, currentData) {
            if (!currentData) {
              return result
            }
            const index = currentData.pending.findIndex(
              tx => tx.txId === result.pending[0].txId
            )
            const previousData = { ...currentData } // Make sure we don't mutate previous data
            const existingTransfer = previousData.pending[index]
            if (existingTransfer) {
              previousData.pending[index] = {
                ...existingTransfer,
                ...result.pending[0],
                cctpData: {
                  ...existingTransfer.cctpData,
                  ...result.pending[0].cctpData
                }
              }
              return previousData
            }

            return {
              pending: result.pending.concat(currentData.pending),
              completed: result.completed.concat(currentData.completed)
            }
          },
          revalidate: false
        }
      )
    },
    [mutateDeposits, mutateWithdrawals]
  )

  const setPendingDeposit = useCallback(
    (transfer: PartialMergedTransaction) => {
      setPendingTransfer(transfer, true)
    },
    [setPendingTransfer]
  )

  const setPendingWithdrawal = useCallback(
    (transfer: PartialMergedTransaction) => {
      setPendingTransfer(transfer, false)
    },
    [setPendingTransfer]
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
    setPendingDeposit,
    setPendingWithdrawal
  }
}

export function useClaimCctp(tx: MergedTransaction) {
  const [isClaiming, setIsClaiming] = useState(false)
  const { waitForAttestation, receiveMessage } = useCCTP({
    sourceChainId: tx.cctpData?.sourceChainId
  })
  const { isSmartContractWallet } = useAccountType()

  const { updateTransfer } = useCctpState()
  const { data: signer } = useSigner()

  const claim = useCallback(async () => {
    if (!tx.cctpData?.attestationHash || !tx.cctpData.messageBytes || !signer) {
      return
    }

    setIsClaiming(true)
    try {
      const attestation = await waitForAttestation(tx.cctpData.attestationHash)
      const receiveTx = await receiveMessage({
        attestation,
        messageBytes: tx.cctpData.messageBytes as `0x${string}`,
        signer
      })
      const receiveReceiptTx = await receiveTx.wait()

      const resolvedAt =
        receiveReceiptTx.status === 1
          ? getStandardizedTimestamp(BigNumber.from(Date.now()).toString())
          : null
      updateTransfer({
        ...tx,
        resolvedAt,
        cctpData: {
          ...tx.cctpData,
          receiveMessageTimestamp: resolvedAt,
          receiveMessageTransactionHash:
            receiveReceiptTx.status === 1
              ? (receiveReceiptTx.transactionHash as `0x${string}`)
              : null
        }
      })

      const targetChainId = getTargetChainIdFromSourceChain(tx)
      const currentNetworkName = getNetworkName(targetChainId)
      const { isEthereum } = isNetwork(targetChainId)

      if (shouldTrackAnalytics(currentNetworkName)) {
        trackEvent(isEthereum ? 'CCTP Withdrawal' : 'CCTP Deposit', {
          accountType: isSmartContractWallet ? 'Smart Contract' : 'EOA',
          network: currentNetworkName,
          amount: Number(tx.value),
          complete: true
        })
      }

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
    updateTransfer,
    waitForAttestation
  ])

  return {
    isClaiming,
    claim
  }
}

export function getL1ChainIdFromSourceChain(tx: MergedTransaction) {
  if (!tx.cctpData) {
    return ChainId.Mainnet
  }

  return {
    [ChainId.Mainnet]: ChainId.Mainnet,
    [ChainId.Goerli]: ChainId.Goerli,
    [ChainId.ArbitrumOne]: ChainId.Mainnet,
    [ChainId.ArbitrumGoerli]: ChainId.Goerli
  }[tx.cctpData.sourceChainId]
}

export function getTargetChainIdFromSourceChain(tx: MergedTransaction) {
  if (!tx.cctpData) {
    return ChainId.Mainnet
  }

  return {
    [ChainId.Mainnet]: ChainId.ArbitrumOne,
    [ChainId.Goerli]: ChainId.ArbitrumGoerli,
    [ChainId.ArbitrumOne]: ChainId.Mainnet,
    [ChainId.ArbitrumGoerli]: ChainId.Goerli
  }[tx.cctpData.sourceChainId]
}

export function useRemainingTime(tx: MergedTransaction) {
  const l1SourceChain = getL1ChainIdFromSourceChain(tx)
  const requiredL1BlocksBeforeConfirmation =
    getBlockBeforeConfirmation(l1SourceChain)
  const blockTime = getBlockTime(l1SourceChain)

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

    setCanBeClaimedDate(
      dayjs(tx.createdAt).add(
        requiredL1BlocksBeforeConfirmation * blockTime,
        'seconds'
      )
    )
  }, [blockTime, requiredL1BlocksBeforeConfirmation, tx.createdAt, tx.status])

  useInterval(() => {
    if (!canBeClaimedDate) {
      return
    }

    if (dayjs().isAfter(canBeClaimedDate)) {
      setIsConfirmed(true)
    } else {
      setRemainingTime(canBeClaimedDate.fromNow().toString())
    }
  }, 2000)

  return {
    remainingTime,
    isConfirmed
  }
}
