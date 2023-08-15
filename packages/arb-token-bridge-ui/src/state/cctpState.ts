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
import { useBlockNumber, useSigner } from 'wagmi'
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

// see https://developers.circle.com/stablecoin/docs/cctp-technical-reference#block-confirmations-for-attestations
export function getBlockBeforeConfirmation(
  chainId: CCTPSupportedChainId | undefined
) {
  if (!chainId) {
    return 65
  }

  return {
    [ChainId.Mainnet]: 65,
    [ChainId.ArbitrumOne]: 65,
    [ChainId.Goerli]: 5,
    [ChainId.ArbitrumGoerli]: 5
  }[chainId]
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
  chainId: ChainId,
  isPending: boolean
): MergedTransaction {
  const depositStatus = isPending
    ? DepositStatus.CCTP_SOURCE_SUCCESS
    : DepositStatus.CCTP_DESTINATION_SUCCESS

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
    depositStatus,
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
      parseTransferToMergedTransaction(pendingDeposit, chainId, true)
    ),
    completed: completed.map(completedDeposit =>
      parseTransferToMergedTransaction(completedDeposit, chainId, false)
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
  const { data, error, isLoading } = useSWRImmutable(
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
        'cctp-deposits'
      ] as const
    },
    ([_walletAddress, _l1ChainId, _pageNumber, _pageSize]) =>
      fetchCCTPDeposits({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId,
        pageNumber: _pageNumber,
        pageSize: _pageSize
      }).then(deposits => parseSWRResponse(deposits, _l1ChainId))
  )

  return { data, error, isLoading }
}

export const useCCTPWithdrawals = ({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  enabled
}: fetchCctpParams) => {
  const { data, error, isLoading, isValidating } = useSWRImmutable(
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
      ] as const
    },
    ([_walletAddress, _l1ChainId, _pageNumber, _pageSize]) =>
      fetchCCTPWithdrawals({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId,
        pageNumber: _pageNumber,
        pageSize: _pageSize
      }).then(withdrawals => parseSWRResponse(withdrawals, _l1ChainId))
  )

  return { data, error, isLoading, isValidating }
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
  setPendingTransfer: (transfer: MergedTransaction) => void
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
    const pendings = transfers.pending
    const completeds = transfers.completed

    const transfersMap = get().transfers
    const ids = [...get().transfersIds]

    const transactions = [...pendings, ...completeds]
      .concat(Object.values(transfersMap))
      .sort((t1, t2) => (t2.blockNum || 0) - (t1.blockNum || 0))

    for (const transfer of transactions) {
      if (!transfersMap[transfer.txId]) {
        transfersMap[transfer.txId] = transfer
        ids.push(transfer.txId)
      }
    }

    return set({
      transfers: transfersMap,
      transfersIds: ids
    })
  },
  setPendingTransfer: async transfer => {
    return set(prevState => ({
      transfers: {
        ...prevState.transfers,
        [transfer.txId]: transfer
      },
      // Set the new transfer as first item (showing first in pending transaction)
      transfersIds: [...new Set([transfer.txId].concat(prevState.transfersIds))]
    }))
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
    setPendingTransfer,
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
          if (
            transfer.depositStatus === DepositStatus.CCTP_SOURCE_PENDING ||
            transfer.depositStatus === DepositStatus.CCTP_SOURCE_SUCCESS ||
            transfer.depositStatus === DepositStatus.CCTP_DESTINATION_PENDING ||
            transfer.status !== 'Executed'
          ) {
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
    setPendingTransfer,
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
    l1: { provider: l1Provider, network: l1Network },
    l2: { provider: l2Provider, network: l2Network }
  } = useNetworksAndSigners()
  const getTransactionReceipt = useCallback(
    async (tx: MergedTransaction) => {
      const provider = tx.direction === 'deposit' ? l1Provider : l2Provider
      const receipt = await provider.getTransactionReceipt(tx.txId)
      return {
        receipt,
        chainId: tx.direction === 'deposit' ? l1Network.id : l2Network.id,
        tx
      }
    },
    [l1Network.id, l1Provider, l2Network.id, l2Provider]
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
    receipts.forEach(({ chainId, receipt, tx }) => {
      const requiredBlocksBeforeConfirmation =
        getBlockBeforeConfirmation(chainId)

      if (!receipt) {
        return
      }

      if (receipt.status === 0) {
        updateTransfer({
          txId: receipt.transactionHash,
          status: 'Failure',
          depositStatus: DepositStatus.CCTP_SOURCE_FAILURE
        })
      } else if (tx.cctpData?.receiveMessageTransactionHash) {
        updateTransfer({
          txId: receipt.transactionHash,
          status: 'Executed',
          depositStatus: DepositStatus.CCTP_DESTINATION_SUCCESS
        })
      } else if (receipt.confirmations > requiredBlocksBeforeConfirmation) {
        // If transaction claim was set to failure, don't reset to Confirmed
        if (tx.status === 'Failure') {
          return
        }

        updateTransfer({
          txId: receipt.transactionHash,
          status: 'Confirmed',
          depositStatus: DepositStatus.CCTP_DESTINATION_PENDING
        })
      }
    })
  }, [getTransactionReceipt, pendingTransactions, updateTransfer])

  return { updateCctpTransactions }
}

type useCctpFetchingParams = {
  l1ChainId: ChainId
  walletAddress: `0x${string}` | undefined
  pageSize: number
  pageNumber: number
  type: 'deposits' | 'withdrawals' | 'all'
}
export function useCctpFetching({
  l1ChainId,
  walletAddress,
  pageSize = 10,
  pageNumber,
  type
}: useCctpFetchingParams) {
  const {
    data: deposits,
    isLoading: isLoadingDeposits,
    error: depositsError
  } = useCCTPDeposits({
    l1ChainId,
    walletAddress,
    pageNumber,
    pageSize,
    enabled: type !== 'withdrawals'
  })
  const {
    data: withdrawals,
    isLoading: isLoadingWithdrawals,
    error: withdrawalsError
  } = useCCTPWithdrawals({
    l1ChainId,
    walletAddress,
    pageNumber,
    pageSize,
    enabled: type !== 'deposits'
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

  return {
    deposits,
    withdrawals,
    isLoadingDeposits,
    isLoadingWithdrawals,
    depositsError,
    withdrawalsError
  }
}

export function useClaimCctp(tx: MergedTransaction) {
  const [isClaiming, setIsClaiming] = useState(false)
  const { waitForAttestation, receiveMessage } = useCCTP({
    sourceChainId: tx.cctpData?.sourceChainId
  })
  const { isSmartContractWallet = false } = useAccountType()

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

        status: receiveReceiptTx.status === 1 ? 'Executed' : 'Failure',
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
  const { data: currentBlockNumber } = useBlockNumber({
    chainId: tx.cctpData?.sourceChainId,
    watch: true
  })

  const requiredBlocksBeforeConfirmation = getBlockBeforeConfirmation(
    tx.cctpData?.sourceChainId as CCTPSupportedChainId
  )

  const l1SourceChain = getL1ChainIdFromSourceChain(tx)
  const blockTime =
    tx.direction === 'deposit' ? getBlockTime(l1SourceChain) : 15

  const [remainingTime, setRemainingTime] = useState<string | null>(
    'Calculating...'
  )
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    if (!currentBlockNumber || !tx.blockNum) {
      return
    }

    const elapsedBlocks = Math.max(currentBlockNumber - tx.blockNum, 0)
    const blocksLeftBeforeConfirmation = Math.max(
      requiredBlocksBeforeConfirmation - elapsedBlocks,
      0
    )
    const withdrawalDate = dayjs().add(
      blocksLeftBeforeConfirmation * blockTime,
      'second'
    )

    if (blocksLeftBeforeConfirmation === 0) {
      setIsConfirmed(true)
    }

    if (tx.status !== 'Failure') {
      setRemainingTime(dayjs().to(withdrawalDate, true))
    }
  }, [
    blockTime,
    currentBlockNumber,
    requiredBlocksBeforeConfirmation,
    tx.blockNum,
    tx.status
  ])

  useEffect(() => {
    if (tx.status === 'Failure') {
      setRemainingTime('')
    }
  }, [tx.status, setRemainingTime])

  return {
    remainingTime,
    isConfirmed
  }
}
