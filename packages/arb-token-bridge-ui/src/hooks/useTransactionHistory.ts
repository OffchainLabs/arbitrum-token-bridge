import { getChains, getChildChainIds } from '../util/networks'
import { ChainId } from '../types/ChainId'
import {
  AssetType,
  L2ToL1EventResultPlus,
  WithdrawalInitiated
} from './arbTokenBridge.types'
import { Transaction } from '../types/Transactions'
import { MergedTransaction } from '../state/app/state'
import {
  normalizeTimestamp,
  transformDeposit,
  transformWithdrawal
} from '../state/app/utils'
import {
  EthWithdrawal,
  isTokenWithdrawal,
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalFromSubgraphToL2ToL1EventResult
} from '../util/withdrawals/helpers'
import { WithdrawalFromSubgraph } from '../util/withdrawals/fetchWithdrawalsFromSubgraph'
import { updateAdditionalDepositData } from '../util/deposits/helpers'
import {
  isCctpTransfer,
  isOftTransfer
} from '../components/TransactionHistory/helpers'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { Address } from '../util/AddressUtils'
import { TeleportFromSubgraph } from '../util/teleports/fetchTeleports'
import {
  isTransferTeleportFromSubgraph,
  transformTeleportFromSubgraph
} from '../util/teleports/helpers'
import {
  LayerZeroTransaction,
  updateAdditionalLayerZeroData
} from './useOftTransactionHistory'
import { create } from 'zustand'
import useSWR from 'swr'
import { BigNumber } from 'ethers'

export type UseTransactionHistoryResult = {
  transactions: MergedTransaction[]
  loading: boolean
  completed: boolean
  error: unknown
  failedChainPairs: ChainPair[]
  pause: () => void
  resume: () => void
  addPendingTransaction: (tx: MergedTransaction) => void
  updatePendingTransaction: (tx: MergedTransaction) => Promise<void>
}

export type ChainPair = { parentChainId: ChainId; childChainId: ChainId }

export type Deposit = Transaction

export type Withdrawal =
  | WithdrawalFromSubgraph
  | WithdrawalInitiated
  | EthWithdrawal

type DepositOrWithdrawal = Deposit | Withdrawal
export type Transfer =
  | DepositOrWithdrawal
  | MergedTransaction
  | TeleportFromSubgraph
  | LayerZeroTransaction

type ForceFetchReceivedStore = {
  forceFetchReceived: boolean
  setForceFetchReceived: (forceFetchReceived: boolean) => void
}

export const useForceFetchReceived = create<ForceFetchReceivedStore>(set => ({
  forceFetchReceived: false,
  setForceFetchReceived: forceFetchReceived => set({ forceFetchReceived })
}))

function getTransactionTimestamp(tx: Transfer) {
  if (isCctpTransfer(tx)) {
    return normalizeTimestamp(tx.createdAt ?? 0)
  }

  if (isOftTransfer(tx)) {
    return normalizeTimestamp(tx.createdAt ?? 0)
  }

  if (isTransferTeleportFromSubgraph(tx)) {
    return normalizeTimestamp(tx.timestamp)
  }

  if (isDeposit(tx)) {
    return normalizeTimestamp(tx.timestampCreated ?? 0)
  }

  if (isWithdrawalFromSubgraph(tx)) {
    return normalizeTimestamp(tx.l2BlockTimestamp)
  }

  return normalizeTimestamp(tx.timestamp?.toNumber() ?? 0)
}

function sortByTimestampDescending(a: Transfer, b: Transfer) {
  return getTransactionTimestamp(a) > getTransactionTimestamp(b) ? -1 : 1
}

function getMultiChainFetchList(): ChainPair[] {
  return getChains().flatMap(chain => {
    // We only grab child chains because we don't want duplicates and we need the parent chain
    // Although the type is correct here we default to an empty array for custom networks backwards compatibility
    const childChainIds = getChildChainIds(chain)

    const isParentChain = childChainIds.length > 0

    if (!isParentChain) {
      // Skip non-parent chains
      return []
    }

    // For each destination chain, map to an array of ChainPair objects
    return childChainIds.map(childChainId => ({
      parentChainId: chain.chainId,
      childChainId: childChainId
    }))
  })
}

function isWithdrawalFromSubgraph(
  tx: Withdrawal
): tx is WithdrawalFromSubgraph {
  return tx.source === 'subgraph'
}

function isDeposit(tx: DepositOrWithdrawal): tx is Deposit {
  return tx.direction === 'deposit'
}

async function transformTransaction(tx: Transfer): Promise<MergedTransaction> {
  // teleport-from-subgraph doesn't have a child-chain-id, we detect it later, hence, an early return
  if (isTransferTeleportFromSubgraph(tx)) {
    return await transformTeleportFromSubgraph(tx)
  }

  const parentProvider = getProviderForChainId(tx.parentChainId)
  const childProvider = getProviderForChainId(tx.childChainId)

  if (isCctpTransfer(tx)) {
    return tx
  }

  if (isOftTransfer(tx)) {
    return await updateAdditionalLayerZeroData(tx)
  }

  if (isDeposit(tx)) {
    return transformDeposit(await updateAdditionalDepositData(tx))
  }

  let withdrawal: L2ToL1EventResultPlus | undefined

  if (isWithdrawalFromSubgraph(tx)) {
    withdrawal = await mapWithdrawalFromSubgraphToL2ToL1EventResult({
      withdrawal: tx,
      l1Provider: parentProvider,
      l2Provider: childProvider
    })
  } else {
    if (isTokenWithdrawal(tx)) {
      withdrawal = await mapTokenWithdrawalFromEventLogsToL2ToL1EventResult({
        result: tx,
        l1Provider: parentProvider,
        l2Provider: childProvider
      })
    } else {
      withdrawal = await mapETHWithdrawalToL2ToL1EventResult({
        event: tx,
        l1Provider: parentProvider,
        l2Provider: childProvider
      })
    }
  }

  if (withdrawal) {
    return transformWithdrawal(withdrawal)
  }

  // Throw user friendly error in case we catch it and display in the UI.
  throw new Error(
    'An error has occurred while fetching a transaction. Please try again later or contact the support.'
  )
}

function getTxIdFromTransaction(tx: Transfer) {
  if (isTransferTeleportFromSubgraph(tx)) {
    return tx.transactionHash
  }

  if (isCctpTransfer(tx) || isOftTransfer(tx)) {
    return tx.txId
  }
  if (isDeposit(tx)) {
    return tx.txID
  }
  if (isWithdrawalFromSubgraph(tx)) {
    return tx.l2TxHash
  }
  if (isTokenWithdrawal(tx)) {
    return tx.txHash
  }
  return tx.l2TxHash ?? tx.transactionHash
}

function getCacheKeyFromTransaction(tx: Transfer) {
  const txId = getTxIdFromTransaction(tx)
  if (!txId) {
    return undefined
  }
  return `${tx.parentChainId}-${txId.toLowerCase()}`
}

// remove the duplicates from the transactions passed
function dedupeTransactions(txs: Transfer[]) {
  return Array.from(
    new Map(txs.map(tx => [getCacheKeyFromTransaction(tx), tx])).values()
  )
}

function indexerTransactionToMergedTransaction(
  tx: IndexerTransaction
): MergedTransaction {
  return {
    sender: tx.sourceChain.address,
    destination: tx.destinationChain.address,
    direction: [TransferType.ETH_DEPOSIT, TransferType.ERC20_DEPOSIT].includes(
      tx.transferType
    )
      ? 'deposit-l1'
      : 'withdraw',
    status: 'pending',
    createdAt: tx.sourceChain.createdAt,
    resolvedAt: tx.destinationChain.settledAt,
    txId: tx.sourceChain.transactionHash,
    asset: tx.sourceChain.token ? tx.sourceChain.token.symbol : 'ETH',
    assetType: tx.sourceChain.token ? AssetType.ERC20 : AssetType.ETH,
    value: tx.sourceChain.amount.toString(),
    uniqueId: BigNumber.from(0),
    isWithdrawal: [
      TransferType.ETH_WITHDRAWAL,
      TransferType.ERC20_WITHDRAWAL
    ].includes(tx.transferType),
    blockNum: 0,
    tokenAddress: tx.sourceChain.token?.address ?? null,
    isCctp: false,
    isOft: false,
    nodeBlockDeadline: 0,
    depositStatus: 1,
    parentChainId: tx.parentChain.chainId,
    childChainId: tx.childChain.chainId,
    sourceChainId: tx.sourceChain.chainId,
    destinationChainId: tx.destinationChain.chainId
  }
}

interface TokenDetails {
  symbol: string
  decimals: number
  address: string
  name: string
}

type IndexerPartialTransaction = {
  address: Address
  chainId: number
  transactionHash: string
  status: string
  createdAt: number
  settledAt: number
  amount: number
  token?: TokenDetails
}

enum TransferType {
  ETH_DEPOSIT = 'eth_deposit',
  ETH_WITHDRAWAL = 'eth_withdrawal',
  ERC20_DEPOSIT = 'erc20_deposit',
  ERC20_WITHDRAWAL = 'erc20_withdrawal'
}

export enum TransferStatus {
  // Deposit initiated on Parent, awaiting finalization on Child
  PENDING_CHILD_EXECUTION = 'PENDING_CHILD_EXECUTION',
  // Withdrawal initiated on Child, awaiting claim on Parent
  PENDING_PARENT_EXECUTION = 'PENDING_PARENT_EXECUTION',
  // Deposit finalized on Child
  COMPLETED = 'COMPLETED',
  // Withdrawal awaiting user to claim it (has been confirmed in outbox)
  READY_TO_CLAIM = 'READY_TO_CLAIM',
  // Withdrawal claimed on Parent
  CLAIMED = 'CLAIMED',
  // Retryable failed/expired
  FAILED = 'FAILED',
  // Error cases
  ERROR_TOKEN_LOOKUP = 'ERROR_TOKEN_LOOKUP',
  ERROR_CLAIM_CHECK = 'ERROR_CLAIM_CHECK'
}

type IndexerTransaction = {
  sourceChain: IndexerPartialTransaction
  destinationChain: IndexerPartialTransaction
  parentChain: IndexerPartialTransaction
  childChain: IndexerPartialTransaction
  transferType: TransferType
}

export const useTransactionHistory = (address: Address | undefined) => {
  const { data, isLoading } = useSWR<IndexerTransaction[]>(
    address ? [address, 'useTransactionHistory'] : null,
    ([_address]) => {
      return []
    }
  )

  return { transactions: data || [], isLoading }
}
