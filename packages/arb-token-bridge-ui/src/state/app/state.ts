import dayjs from 'dayjs'
import { ethers, BigNumber } from 'ethers'
import _isEmpty from 'lodash/isEmpty'
import _reverse from 'lodash/reverse'
import _sortBy from 'lodash/sortBy'
import { derived } from 'overmind'
import {
  ArbTokenBridge,
  ERC20BridgeToken,
  L2ToL1EventResultPlus,
  Transaction,
  TxnType,
  OutgoingMessageState,
  NodeBlockDeadlineStatus,
  L1ToL2MessageData
} from 'token-bridge-sdk'

import { ConnectionState, PendingWithdrawalsLoadedState } from '../../util'
import Networks, { Network } from '../../util/networks'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'

export enum WhiteListState {
  VERIFYING,
  ALLOWED,
  DISALLOWED
}

export enum DepositStatus {
  L1_PENDING = 1,
  L1_FAILURE = 2,
  L2_PENDING = 3,
  L2_SUCCESS = 4,
  L2_FAILURE = 5,
  CREATION_FAILED = 6,
  EXPIRED = 7
}

const getDepositStatus = (tx: Transaction) => {
  if (tx.type !== 'deposit' && tx.type !== 'deposit-l1') return undefined
  if (tx.status === 'failure') {
    return DepositStatus.L1_FAILURE
  }
  if (tx.status === 'pending') {
    return DepositStatus.L1_PENDING
  }
  // l1 succeeded...
  const { l1ToL2MsgData } = tx
  if (!l1ToL2MsgData) {
    return DepositStatus.L2_PENDING
  }

  switch (l1ToL2MsgData.status) {
    case L1ToL2MessageStatus.NOT_YET_CREATED:
      return DepositStatus.L2_PENDING
    case L1ToL2MessageStatus.CREATION_FAILED:
      return DepositStatus.CREATION_FAILED
    case L1ToL2MessageStatus.EXPIRED:
      return DepositStatus.EXPIRED
    case L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2: {
      return tx.assetType === 'ETH'
        ? DepositStatus.L2_SUCCESS
        : DepositStatus.L2_FAILURE
    }
    case L1ToL2MessageStatus.REDEEMED:
      return DepositStatus.L2_SUCCESS
  }
}

export interface MergedTransaction {
  direction: TxnType
  status: string // todo: this is kind of all over the place r.n
  createdAtTime: number | null
  createdAt: string | null
  resolvedAt: string | null
  txId: string
  asset: string
  value: string | null
  uniqueId: BigNumber | null
  isWithdrawal: boolean
  blockNum: number | null
  tokenAddress: string | null
  seqNum?: number
  nodeBlockDeadline?: NodeBlockDeadlineStatus
  l1ToL2MsgData?: L1ToL2MessageData
  depositStatus?: DepositStatus
}

export interface WarningTokens {
  [address: string]: {
    address: string
    type: number
  }
}

const outgoungStateToString = {
  [OutgoingMessageState.NOT_FOUND]: 'Unconfirmed',
  [OutgoingMessageState.UNCONFIRMED]: 'Unconfirmed',
  [OutgoingMessageState.CONFIRMED]: 'Confirmed',
  [OutgoingMessageState.EXECUTED]: 'Executed'
}

export type AppState = {
  arbTokenBridge: ArbTokenBridge
  warningTokens: WarningTokens
  connectionState: number
  networkID: string | null
  verifying: WhiteListState
  selectedToken: ERC20BridgeToken | null
  isDepositMode: boolean
  sortedTransactions: Transaction[]
  pendingTransactions: Transaction[]
  successfulL1Deposits: Transaction[]
  depositsTransformed: MergedTransaction[]
  withdrawalsTransformed: MergedTransaction[]
  mergedTransactions: MergedTransaction[]
  mergedTransactionsToShow: MergedTransaction[]
  currentL1BlockNumber: number

  networkDetails: Network | null
  l1NetworkDetails: Network | null
  l2NetworkDetails: Network | null

  pwLoadedState: PendingWithdrawalsLoadedState
  arbTokenBridgeLoaded: boolean

  changeNetwork: ((chainId: string) => Promise<void>) | null
}

export const defaultState: AppState = {
  arbTokenBridge: {} as ArbTokenBridge,
  warningTokens: {} as WarningTokens,
  connectionState: ConnectionState.LOADING,
  networkID: null,
  verifying: WhiteListState.ALLOWED,
  selectedToken: null,
  isDepositMode: true,
  sortedTransactions: derived((s: AppState) => {
    const transactions = s.arbTokenBridge?.transactions?.transactions || []
    return [...transactions]
      .filter(tx => tx.sender === s.arbTokenBridge.walletAddress)
      .filter(
        tx => !tx.l1NetworkID || tx.l1NetworkID === s.l1NetworkDetails?.chainID
      )
      .reverse()
  }),
  pendingTransactions: derived((s: AppState) => {
    return s.sortedTransactions.filter(tx => tx.status === 'pending')
  }),
  successfulL1Deposits: derived((s: AppState) => {
    // check 'deposit' and 'deposit-l1' for backwards compatibility with old client side cache
    return s.sortedTransactions.filter(
      (txn: Transaction) =>
        (txn.type === 'deposit' || txn.type === 'deposit-l1') &&
        txn.status === 'success'
    )
  }),
  depositsTransformed: derived((s: AppState) => {
    const deposits: MergedTransaction[] = s.sortedTransactions.map(tx => {
      return {
        direction: tx.type,
        status: tx.status,
        createdAt: tx.timestampCreated
          ? dayjs(tx.timestampCreated).format('HH:mm:ss MM/DD/YYYY')
          : null,
        createdAtTime: tx.timestampCreated
          ? dayjs(tx.timestampCreated).toDate().getTime()
          : null,
        resolvedAt: tx.timestampResolved
          ? dayjs(new Date(tx.timestampResolved)).format('HH:mm:ss MM/DD/YYYY')
          : null,
        txId: tx.txID,
        asset: tx.assetName?.toLowerCase(),
        value: tx.value,
        uniqueId: null, // not needed
        isWithdrawal: false,
        blockNum: tx.blockNumber || null,
        tokenAddress: null, // not needed
        seqNum: tx.seqNum,
        l1ToL2MsgData: tx.l1ToL2MsgData,
        depositStatus: getDepositStatus(tx)
      }
    })
    return deposits
  }),
  withdrawalsTransformed: derived((s: AppState) => {
    const withdrawals: MergedTransaction[] = (
      Object.values(
        s.arbTokenBridge?.pendingWithdrawalsMap || []
      ) as L2ToL1EventResultPlus[]
    ).map(tx => {
      return {
        direction: tx.uniqueId ? 'outbox' : 'withdraw',
        status: outgoungStateToString[tx.outgoingMessageState],
        createdAt: dayjs(
          new Date(BigNumber.from(tx.timestamp).toNumber() * 1000)
        ).format('HH:mm:ss MM/DD/YYYY'),
        createdAtTime:
          BigNumber.from(tx.timestamp).toNumber() * 1000 +
          (tx.uniqueId ? 1000 : 0), // adding 60s for the sort function so that it comes before l2 action
        resolvedAt: null,
        txId: tx.uniqueId?.toString(),
        asset: tx.symbol?.toLocaleLowerCase(),
        value: ethers.utils.formatUnits(tx.value?.toString(), tx.decimals),
        uniqueId: tx.uniqueId,
        isWithdrawal: true,
        blockNum: tx.ethBlockNum.toNumber(),
        tokenAddress: tx.tokenAddress || null,
        nodeBlockDeadline: tx.nodeBlockDeadline
      }
    })
    return withdrawals
  }),
  mergedTransactions: derived((s: AppState) => {
    return _reverse(
      _sortBy([...s.depositsTransformed, ...s.withdrawalsTransformed], item => {
        if (_isEmpty(item.createdAt)) {
          return -1
        }
        return item.createdAtTime
      })
    )
  }),
  mergedTransactionsToShow: derived((s: AppState) => {
    return s.mergedTransactions.filter((txn: MergedTransaction) => {
      switch (txn.direction) {
        // TODO: remove from cache
        case 'deposit-l2-ticket-created':
        case 'deposit-l2-auto-redeem':
        case 'deposit-l2':
          return false
        default:
          break
      }
      return true
    })
  }),
  currentL1BlockNumber: 0,

  networkDetails: derived((s: AppState) => {
    if (!s.networkID) return null
    return Networks[s.networkID]
  }),
  l1NetworkDetails: derived((s: AppState) => {
    const network = s.networkDetails
    if (!network) {
      return null
    }
    if (!network.isArbitrum) {
      return network
    }
    return Networks[network.partnerChainID]
  }),
  l2NetworkDetails: derived((s: AppState) => {
    const network = s.networkDetails
    if (!network) {
      return null
    }
    if (network.isArbitrum) {
      return network
    }
    return Networks[network.partnerChainID]
  }),

  pwLoadedState: PendingWithdrawalsLoadedState.LOADING,
  arbTokenBridgeLoaded: false,
  changeNetwork: null
}
export const state: AppState = {
  ...defaultState
}
