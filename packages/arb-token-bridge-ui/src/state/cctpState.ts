import { BigNumber, utils } from 'ethers'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import useSWRImmutable from 'swr/immutable'

import { CCTPSupportedChainId } from '../hooks/CCTP/useCCTP'
import {
  ChainDomain,
  CompletedCCTPTransfer,
  PendingCCTPTransfer,
  Response
} from '../pages/api/cctp/[type]'
import { ChainId, isNetwork } from '../util/networks'
import { fetchCCTPDeposits, fetchCCTPWithdrawals } from '../util/cctp/fetchCCTP'
import { DepositStatus, MergedTransaction } from './app/state'
import { getStandardizedTimestamp } from './app/utils'
import { fetchBlockNumber } from '@wagmi/core'

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
  transfer: PendingTransfer | CompletedTransfer,
  blockNumbers: {
    [ChainId.Mainnet]: number
    [ChainId.ArbitrumOne]: number
    [ChainId.Goerli]: number
    [ChainId.ArbitrumGoerli]: number
  }
): MergedTransaction {
  const depositStatus = transfer.isPending
    ? DepositStatus.CCTP_SOURCE_SUCCESS
    : DepositStatus.CCTP_DESTINATION_SUCCESS
  let status
  const requiredBlockForConfirmation = getBlockBeforeConfirmation(
    transfer.source.chainId
  )

  const currentBlock = blockNumbers[transfer.source.chainId]
  if (transfer.destination.transactionHash) {
    status = 'Executed'
  } else if (
    currentBlock - transfer.source.blockNum >
    requiredBlockForConfirmation
  ) {
    status = 'Confirmed'
  } else {
    status = 'Unconfirmed'
  }

  return {
    sender: transfer.sender,
    destination: transfer.recipient,
    direction: transfer.direction,
    status,
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

export const useCCTPDeposits = ({
  walletAddress,
  l1ChainId
}: {
  walletAddress?: string
  l1ChainId: ChainId
}) => {
  const { data, error, isLoading } = useSWRImmutable(
    // Only fetch when we have walletAddress
    walletAddress ? [walletAddress, l1ChainId, 'cctp-deposits'] : null,
    ([_walletAddress, _l1ChainId]) =>
      fetchCCTPDeposits({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId
      }).then(withdrawals => parseSWRResponse(withdrawals, _l1ChainId))
  )

  return { data, error, isLoading }
}

export const useCCTPWithdrawals = ({
  walletAddress,
  l1ChainId
}: {
  walletAddress?: string
  l1ChainId: ChainId
}) => {
  const { data, error, isLoading } = useSWRImmutable(
    // Only fetch when we have walletAddress
    walletAddress ? [walletAddress, l1ChainId, 'cctp-withdrawals'] : null,
    ([_walletAddress, _l1ChainId]) =>
      fetchCCTPWithdrawals({
        walletAddress: _walletAddress,
        l1ChainId: _l1ChainId
      }).then(withdrawals => parseSWRResponse(withdrawals, _l1ChainId))
  )
  return { data, error, isLoading }
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
  setTransfers: (
    deposits: {
      pending: PendingTransfer[]
      completed: CompletedTransfer[]
    },
    withdrawals: {
      pending: PendingTransfer[]
      completed: CompletedTransfer[]
    }
  ) => void
  setPendingTransfer: (transfer: PendingTransfer) => void
  updatePendingTransfer: (transfer: MergedTransaction) => void
}

const useCctpStore = create<CctpStore>(set => ({
  transfers: {},
  transfersIds: [],
  setTransfers: async (deposits, withdrawals) => {
    const pendings = deposits.pending
      .concat(withdrawals.pending)
      .sort((t1, t2) => t2.source.timestamp - t1.source.timestamp)
    const completeds = deposits.completed
      .concat(withdrawals.completed)
      .sort((t1, t2) => t2.source.timestamp - t1.source.timestamp)

    const transfers: {
      [id: string]: MergedTransaction
    } = {}
    const ids: string[] = []

    const blockNumbers = await Promise.all([
      fetchBlockNumber({ chainId: ChainId.Mainnet }),
      fetchBlockNumber({ chainId: ChainId.ArbitrumOne }),
      fetchBlockNumber({ chainId: ChainId.Goerli }),
      fetchBlockNumber({ chainId: ChainId.ArbitrumGoerli })
    ])
    for (const transfer of [...pendings, ...completeds]) {
      const parsedTransfer = parseTransferToMergedTransaction(transfer, {
        [ChainId.Mainnet]: blockNumbers[0],
        [ChainId.ArbitrumOne]: blockNumbers[1],
        [ChainId.Goerli]: blockNumbers[2],
        [ChainId.ArbitrumGoerli]: blockNumbers[3]
      })
      transfers[parsedTransfer.txId] = parsedTransfer
      ids.push(parsedTransfer.txId)
    }

    return set({
      transfers: transfers,
      transfersIds: ids
    })
  },
  setPendingTransfer: async transfer => {
    const blockNumbers = await Promise.all([
      fetchBlockNumber({ chainId: ChainId.Mainnet }),
      fetchBlockNumber({ chainId: ChainId.ArbitrumOne }),
      fetchBlockNumber({ chainId: ChainId.Goerli }),
      fetchBlockNumber({ chainId: ChainId.ArbitrumGoerli })
    ])

    return set(prevState => ({
      transfers: {
        ...prevState.transfers,
        [transfer.id]: parseTransferToMergedTransaction(transfer, {
          [ChainId.Mainnet]: blockNumbers[0],
          [ChainId.ArbitrumOne]: blockNumbers[1],
          [ChainId.Goerli]: blockNumbers[2],
          [ChainId.ArbitrumGoerli]: blockNumbers[3]
        })
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

type useCctpStateParams = {
  l1ChainId: ChainId
  walletAddress: `0x${string}` | undefined
}
export function useCctpState({ l1ChainId, walletAddress }: useCctpStateParams) {
  const {
    transfersIds,
    transfers,
    setTransfers,
    setPendingTransfer,
    updatePendingTransfer
  } = useCctpStore()

  const {
    data: deposits,
    isLoading: isLoadingDeposits,
    error: depositsError
  } = useCCTPDeposits({
    l1ChainId,
    walletAddress
  })
  const {
    data: withdrawals,
    isLoading: isLoadingWithdrawals,
    error: withdrawalsError
  } = useCCTPWithdrawals({ l1ChainId, walletAddress })

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
    deposits,
    withdrawals,
    isLoadingDeposits,
    isLoadingWithdrawals,
    depositsError,
    withdrawalsError,
    setPendingTransfer,
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

export function useSyncCctpStore({
  l1ChainId,
  walletAddress
}: useCctpStateParams) {
  const { setTransfers, deposits, withdrawals } = useCctpState({
    l1ChainId,
    walletAddress
  })

  useEffect(() => {
    if (deposits && withdrawals) {
      setTransfers(deposits, withdrawals)
    }
  }, [deposits, withdrawals, setTransfers])
}
