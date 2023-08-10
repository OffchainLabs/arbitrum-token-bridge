import { BigNumber, utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import useSWRImmutable from 'swr/immutable'
import * as Sentry from '@sentry/react'

import { CCTPSupportedChainId, useCCTP } from '../hooks/CCTP/useCCTP'
import {
  ChainDomain,
  CompletedCCTPTransfer,
  PendingCCTPTransfer,
  Response
} from '../pages/api/cctp/[type]'
import { ChainId, getBlockTime, isNetwork } from '../util/networks'
import { fetchCCTPDeposits, fetchCCTPWithdrawals } from '../util/cctp/fetchCCTP'
import { DepositStatus, MergedTransaction } from './app/state'
import { getStandardizedTimestamp } from './app/utils'
import { useBlockNumber, useSigner } from 'wagmi'
import dayjs from 'dayjs'

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

function getChainIdsFromSourceDomain(
  chainId: ChainId,
  sourceDomain: ChainDomain
): {
  source: CCTPSupportedChainId
  target: CCTPSupportedChainId
} {
  const { isTestnet } = isNetwork(chainId)
  // Deposits
  if (sourceDomain === '0') {
    return isTestnet
      ? {
          source: ChainId.Goerli,
          target: ChainId.ArbitrumGoerli
        }
      : {
          source: ChainId.Mainnet,
          target: ChainId.ArbitrumOne
        }
  }

  // Withdrawals
  return isTestnet
    ? {
        source: ChainId.ArbitrumGoerli,
        target: ChainId.Goerli
      }
    : {
        source: ChainId.ArbitrumOne,
        target: ChainId.Mainnet
      }
}

type TransferNetworkInformation = {
  timestamp: number
  transactionHash: `0x${string}`
  chainId: CCTPSupportedChainId
}
type TransferSource = TransferNetworkInformation & {
  blockNum: number
}
export type CompletedTransfer = {
  id: string
  source: TransferSource
  destination: TransferNetworkInformation
  sender: `0x${string}`
  recipient: `0x${string}`
  amount: BigNumber
  direction: 'deposit' | 'withdraw'
  isPending: false
}
export type PendingTransfer = {
  id: string
  source: TransferSource
  destination: {
    timestamp: null
    transactionHash: null
    chainId: CCTPSupportedChainId
  }
  sender: `0x${string}`
  recipient: `0x${string}`
  amount: BigNumber
  direction: 'deposit' | 'withdraw'
  attestationHash: `0x${string}`
  messageBytes: string
  isPending: true
}

function parsePendingTransfer(
  transfer: PendingCCTPTransfer,
  chainId: ChainId
): PendingTransfer {
  const { messageSent } = transfer
  const { source: sourceChainId, target: targetChainId } =
    getChainIdsFromSourceDomain(chainId, messageSent.sourceDomain)

  return {
    id: messageSent.id,
    source: {
      timestamp: parseInt(messageSent.blockTimestamp, 10) * 1_000,
      transactionHash: messageSent.transactionHash,
      chainId: sourceChainId,
      blockNum: parseInt(messageSent.blockNumber, 10)
    },
    destination: {
      chainId: targetChainId,
      timestamp: null,
      transactionHash: null
    },
    direction:
      messageSent.sourceDomain === ChainDomain.Mainnet ? 'deposit' : 'withdraw',
    sender: messageSent.sender,
    recipient: messageSent.recipient,
    amount: BigNumber.from(messageSent.amount),
    attestationHash: messageSent.attestationHash,
    messageBytes: messageSent.message,
    isPending: true
  }
}
function parseCompletedTransfer(
  transfer: CompletedCCTPTransfer,
  chainId: ChainId
): CompletedTransfer {
  const { messageSent, messageReceived } = transfer
  const { source: sourceChainId, target: targetChainId } =
    getChainIdsFromSourceDomain(chainId, messageSent.sourceDomain)
  return {
    id: messageSent.id,
    source: {
      timestamp: parseInt(messageSent.blockTimestamp, 10) * 1_000,
      transactionHash: messageSent.transactionHash,
      chainId: sourceChainId,
      blockNum: parseInt(messageSent.blockNumber, 10)
    },
    destination: {
      timestamp: parseInt(messageReceived.blockTimestamp, 10) * 1_000,
      transactionHash: messageReceived.transactionHash,
      chainId: targetChainId
    },
    direction:
      messageSent.sourceDomain === ChainDomain.Mainnet ? 'deposit' : 'withdraw',
    sender: messageSent.sender,
    recipient: messageSent.recipient,
    amount: BigNumber.from(messageSent.amount),
    isPending: false
  }
}
// TODO: parse to MergeTransaction
function parseSWRResponse(
  { pending, completed }: Response['data'],
  chainId: ChainId
): {
  pending: PendingTransfer[]
  completed: CompletedTransfer[]
} {
  return {
    pending: pending.map(pendingDeposit =>
      parsePendingTransfer(pendingDeposit, chainId)
    ),
    completed: completed.map(completedDeposit =>
      parseCompletedTransfer(completedDeposit, chainId)
    )
  }
}

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

export function parseTransferToMergedTransaction(
  transfer: PendingTransfer | CompletedTransfer
): MergedTransaction {
  const depositStatus = transfer.isPending
    ? DepositStatus.CCTP_SOURCE_SUCCESS
    : DepositStatus.CCTP_DESTINATION_SUCCESS

  return {
    sender: transfer.sender,
    destination: transfer.recipient,
    direction: transfer.direction,
    status: transfer.destination.transactionHash ? 'Executed' : 'Unconfirmed',
    createdAt: getStandardizedTimestamp(transfer.source.timestamp.toString()),
    resolvedAt: transfer.destination.timestamp
      ? getStandardizedTimestamp(transfer.destination.timestamp.toString())
      : null,
    txId: transfer.source.transactionHash,
    asset: 'USDC',
    value: utils.formatUnits(transfer.amount.toString(), 6),
    uniqueId: null,
    isWithdrawal: transfer.direction === 'withdraw',
    blockNum: transfer.source.blockNum,
    tokenAddress: 'TODO: UPDATE',
    depositStatus,
    isCctp: true,
    cctpData: {
      sourceChainId: transfer.source.chainId,
      attestationHash:
        'attestationHash' in transfer ? transfer.attestationHash : null,
      messageBytes: 'messageBytes' in transfer ? transfer.messageBytes : null,
      receiveMessageTransactionHash: transfer.destination.transactionHash,
      receiveMessageTimestamp: transfer.destination.timestamp
        ? getStandardizedTimestamp(transfer.destination.timestamp.toString())
        : null
    }
  }
}

type fetchCctpParams = {
  walletAddress?: string
  l1ChainId: ChainId
  pageNumber: number
  pageSize: number
  searchString: string
  enabled: boolean
}
export const useCCTPDeposits = ({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  searchString,
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
        searchString,
        'cctp-deposits'
      ] as const
    },
    ([_walletAddress, _l1ChainId, _pageNumber, _pageSize, _searchString]) =>
      fetchCCTPDeposits({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
        searchString: _searchString
      }).then(deposits => parseSWRResponse(deposits, _l1ChainId))
  )

  return { data, error, isLoading }
}

export const useCCTPWithdrawals = ({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  searchString,
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
        searchString,
        'cctp-withdrawals'
      ] as const
    },
    ([_walletAddress, _l1ChainId, _pageNumber, _pageSize, _searchString]) =>
      fetchCCTPWithdrawals({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
        searchString: _searchString
      }).then(withdrawals => parseSWRResponse(withdrawals, _l1ChainId))
  )

  return { data, error, isLoading, isValidating }
}

export type PendingTransferMap = {
  [id: string]: PendingTransfer
}
export type CompletedTransferMap = {
  [id: string]: CompletedTransfer
}

type CctpStore = {
  transfers: { [id: string]: MergedTransaction }
  transfersIds: string[]
  setTransfers: (transfers: {
    pending: PendingTransfer[]
    completed: CompletedTransfer[]
  }) => void
  resetTransfers: () => void
  setPendingTransfer: (transfer: PendingTransfer) => void
  updatePendingTransfer: (transfer: MergedTransaction) => void
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
      .map(transfer => parseTransferToMergedTransaction(transfer))
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
        [transfer.id]: parseTransferToMergedTransaction(transfer)
      },
      // Set the new transfer as first item (showing first in pending transaction)
      transfersIds: [...new Set([transfer.id].concat(prevState.transfersIds))]
    }))
  },
  updatePendingTransfer: transfer =>
    set(prevState => ({
      transfers: {
        ...prevState.transfers,
        [transfer.txId]: transfer
      }
    }))
}))

export function useCctpState() {
  const {
    transfersIds,
    transfers,
    resetTransfers,
    setTransfers,
    setPendingTransfer,
    updatePendingTransfer
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
          if (transfer.depositStatus === DepositStatus.CCTP_SOURCE_SUCCESS) {
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
    updatePendingTransfer
  }
}

type useCctpFetchingParams = {
  l1ChainId: ChainId
  walletAddress: `0x${string}` | undefined
  pageSize: number
  pageNumber: number
  searchString: string
  type: 'deposits' | 'withdrawals' | 'all'
}
export function useCctpFetching({
  l1ChainId,
  walletAddress,
  pageSize = 10,
  pageNumber,
  searchString = '',
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
    searchString,
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
    searchString,
    enabled: type !== 'deposits'
  })
  const { setTransfers, resetTransfers } = useCctpState()

  useEffect(() => {
    resetTransfers()
  }, [searchString, resetTransfers])

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

  const { updatePendingTransfer } = useCctpState()
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
      updatePendingTransfer({
        ...tx,
        resolvedAt: getStandardizedTimestamp(
          BigNumber.from(Date.now()).toString()
        ),
        status: 'Executed',
        depositStatus: DepositStatus.CCTP_DESTINATION_SUCCESS,
        cctpData: {
          ...tx.cctpData,
          receiveMessageTransactionHash:
            receiveReceiptTx.transactionHash as `0x${string}`
        }
      })
    } catch (e) {
      Sentry.captureException(e)
    } finally {
      setIsClaiming(false)
    }
  }, [receiveMessage, signer, tx, updatePendingTransfer, waitForAttestation])

  return {
    isClaiming,
    claim
  }
}

export function useRemainingTime(tx: MergedTransaction) {
  const { data: currentBlockNumber } = useBlockNumber({
    chainId: tx.cctpData?.sourceChainId,
    watch: true
  })

  const requiredBlocksBeforeConfirmation = getBlockBeforeConfirmation(
    tx.cctpData?.sourceChainId as CCTPSupportedChainId
  )
  const blockTime =
    tx.cctpData?.sourceChainId && tx.direction === 'deposit'
      ? getBlockTime(tx.cctpData.sourceChainId)
      : 15

  const [remainingTime, setRemainingTime] = useState<string | null>(null)
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
    setRemainingTime(dayjs().to(withdrawalDate, true))
  }, [
    blockTime,
    currentBlockNumber,
    requiredBlocksBeforeConfirmation,
    tx.blockNum
  ])

  return {
    remainingTime,
    isConfirmed
  }
}
