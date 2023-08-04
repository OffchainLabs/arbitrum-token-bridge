import { BigNumber } from 'ethers'
import { useEffect } from 'react'
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
  direction: 'deposit' | 'withdrawal'
}
export type PendingTransfer = {
  id: string
  source: TransferSource
  destination: {
    chainId: CCTPSupportedChainId
  }
  sender: `0x${string}`
  recipient: `0x${string}`
  amount: BigNumber
  direction: 'deposit' | 'withdrawal'
  attestationHash: `0x${string}`
  messageBytes: string
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
      timestamp: messageSent.blockTimestamp * 1_000,
      transactionHash: messageSent.transactionHash,
      chainId: sourceChainId,
      blockNum: parseInt(messageSent.blockNumber, 10)
    },
    destination: {
      chainId: targetChainId
    },
    direction:
      messageSent.sourceDomain === ChainDomain.Mainnet
        ? 'deposit'
        : 'withdrawal',
    sender: messageSent.sender,
    recipient: messageSent.sender, // TODO: update in subgraph
    amount: BigNumber.from(2), // TODO: update in subgraph
    attestationHash: messageSent.attestationHash,
    messageBytes: messageSent.message
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
      timestamp: messageSent.blockTimestamp * 1_000,
      transactionHash: messageSent.transactionHash,
      chainId: sourceChainId,
      blockNum: parseInt(messageSent.blockNumber, 10)
    },
    destination: {
      timestamp: messageReceived.blockTimestamp * 1_000,
      transactionHash: messageReceived.transactionHash,
      chainId: targetChainId
    },
    direction:
      messageSent.sourceDomain === ChainDomain.Mainnet
        ? 'deposit'
        : 'withdrawal',
    sender: messageSent.sender,
    recipient: messageSent.sender, // TODO: update in subgraph
    amount: BigNumber.from(2) // TODO: update in subgraph
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
function transformPendingToCompletedTransfer(
  pendingTransfer: PendingTransfer,
  timestamp: number,
  transactionHash: `0x${string}`
): CompletedTransfer {
  return {
    ...pendingTransfer,
    destination: {
      chainId: pendingTransfer.destination.chainId,
      timestamp: timestamp,
      transactionHash: transactionHash
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
  pending: { [id: string]: PendingTransfer }
  completed: { [id: string]: CompletedTransfer }
  pendingIds: string[]
  completedIds: string[]
  setPendingTransfers: (transfers: PendingTransfer[]) => void
  setCompletedTransfers: (transfers: CompletedTransfer[]) => void
  setPendingTransfer: (transfer: PendingTransfer) => void
  completePendingTransfer: (
    transfer: PendingTransfer,
    timestamp: number,
    transactionHash: string
  ) => void
}

const useCctpStore = create<CctpStore>(set => ({
  pending: {},
  completed: {},
  pendingIds: [],
  completedIds: [],
  setPendingTransfers: async transfers =>
    set(() => {
      const transfersOrdered = transfers.sort(
        (t1, t2) => t2.source.timestamp - t1.source.timestamp
      )
      const transfersParsed: { [id: string]: PendingTransfer } = {}
      const ids: string[] = []
      for (const transfer of transfersOrdered) {
        transfersParsed[transfer.id] = transfer
        ids.push(transfer.id)
      }

      return {
        pending: transfersParsed,
        pendingIds: ids
      }
    }),
  setCompletedTransfers: async transfers =>
    set(() => {
      const transfersOrdered = transfers.sort(
        (t1, t2) => t2.destination.timestamp - t1.destination.timestamp
      )
      const transfersParsed: { [id: string]: CompletedTransfer } = {}
      const ids: string[] = []
      for (const transfer of transfersOrdered) {
        transfersParsed[transfer.id] = transfer
        ids.push(transfer.id)
      }

      return {
        completed: transfersParsed,
        completedIds: ids
      }
    }),
  setPendingTransfer: transfer =>
    set(prevState => ({
      pending: {
        ...prevState.pending,
        [transfer.id]: transfer
      },
      // Set the new transfer as first item (showing first in pending transaction)
      pendingIds: [...new Set([transfer.id].concat(prevState.pendingIds))]
    })),
  completePendingTransfer: (
    transfer: PendingTransfer,
    timestamp: number,
    transactionHash: string
  ) =>
    set(prevState => ({
      completed: {
        ...prevState.completed,
        [transfer.id]: transformPendingToCompletedTransfer(
          transfer,
          timestamp,
          transactionHash as `0x${string}`
        )
      },
      pendingIds: prevState.pendingIds.filter(
        pendingId => pendingId !== transfer.id
      ),
      completedIds: [...new Set(prevState.completedIds.concat(transfer.id))]
    }))
}))

type useCctpStateParams = {
  l1ChainId: ChainId
  walletAddress: `0x${string}` | undefined
}
export function useCctpState({ l1ChainId, walletAddress }: useCctpStateParams) {
  const {
    completed,
    completedIds,
    pending,
    pendingIds,
    setPendingTransfers,
    setCompletedTransfers,
    setPendingTransfer,
    completePendingTransfer
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

  return {
    deposits,
    withdrawals,
    completed,
    completedIds,
    pending,
    pendingIds,
    isLoadingDeposits,
    isLoadingWithdrawals,
    depositsError,
    withdrawalsError,
    setPendingTransfer,
    completePendingTransfer,
    setPendingTransfers,
    setCompletedTransfers
  }
}

export function useSyncCctpStore({
  l1ChainId,
  walletAddress
}: useCctpStateParams) {
  const { setPendingTransfers, setCompletedTransfers, deposits, withdrawals } =
    useCctpState({ l1ChainId, walletAddress })

  useEffect(() => {
    setPendingTransfers([
      ...(deposits?.pending || []),
      ...(withdrawals?.pending || [])
    ])
  }, [deposits, withdrawals, setPendingTransfers])

  useEffect(() => {
    setCompletedTransfers([
      ...(deposits?.completed || []),
      ...(withdrawals?.completed || [])
    ])
  }, [deposits, withdrawals, setCompletedTransfers])
}
