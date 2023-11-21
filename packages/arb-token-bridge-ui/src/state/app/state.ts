import {
  isEmpty as _isEmpty,
  reverse as _reverse,
  sortBy as _sortBy
} from 'lodash-es'
import { derived } from 'overmind'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import { getAccount } from '@wagmi/core'
import { BigNumber } from 'ethers'
import dayjs from 'dayjs'

import {
  filterTransactions,
  transformDeposits,
  transformWithdrawals
} from './utils'

import {
  ArbTokenBridge,
  AssetType,
  ERC20BridgeToken,
  L2ToL1EventResultPlus,
  NodeBlockDeadlineStatus
} from '../../hooks/arbTokenBridge.types'
import {
  L1ToL2MessageData,
  L2ToL1MessageData,
  Transaction,
  TxnType
} from '../../hooks/useTransactions'
import { ConnectionState } from '../../util'
import { CCTPSupportedChainId } from '../cctpState'

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
  EXPIRED = 7,
  CCTP_DEFAULT_STATE = 8 // Cctp only relies on tx.status
}

export enum WithdrawalStatus {
  EXECUTED = 'Executed',
  UNCONFIRMED = 'Unconfirmed',
  CONFIRMED = 'Confirmed',
  EXPIRED = 'Expired',
  FAILURE = 'Failure'
}

export interface MergedTransaction {
  // TODO: https://github.com/OffchainLabs/arbitrum-token-bridge/blob/master/packages/arb-token-bridge-ui/src/util/withdrawals/helpers.ts#L31
  // should return sender as well, then we can make it non-optional
  sender?: string
  destination?: string
  direction: TxnType
  status?: string // TODO: Use enums
  createdAt: number | null
  resolvedAt: number | null
  txId: string
  asset: string
  assetType: AssetType
  value: string | null
  uniqueId: BigNumber | null
  isWithdrawal: boolean
  blockNum: number | null
  tokenAddress: string | null
  isCctp?: boolean
  nodeBlockDeadline?: NodeBlockDeadlineStatus
  l1ToL2MsgData?: L1ToL2MessageData
  l2ToL1MsgData?: L2ToL1MessageData
  depositStatus?: DepositStatus
  chainId: number
  parentChainId: number
  cctpData?: {
    sourceChainId?: CCTPSupportedChainId
    attestationHash?: `0x${string}` | null
    messageBytes?: string | null
    receiveMessageTransactionHash?: `0x${string}` | null
    receiveMessageTimestamp?: number | null
  }
}

export interface WarningTokens {
  [address: string]: {
    address: string
    type: number
  }
}

export type AppState = {
  arbTokenBridge: ArbTokenBridge
  warningTokens: WarningTokens
  connectionState: number
  selectedToken: ERC20BridgeToken | null
  isDepositMode: boolean
  sortedTransactions: Transaction[]
  verifying: WhiteListState
  pendingTransactions: Transaction[]
  l1DepositsWithUntrackedL2Messages: Transaction[]
  failedRetryablesToRedeem: MergedTransaction[]
  depositsTransformed: MergedTransaction[]
  withdrawalsTransformed: MergedTransaction[]
  mergedTransactions: MergedTransaction[]
  l1NetworkChainId: number | null
  l2NetworkChainId: number | null
  arbTokenBridgeLoaded: boolean
}

export const defaultState: AppState = {
  arbTokenBridge: {} as ArbTokenBridge,
  warningTokens: {} as WarningTokens,
  connectionState: ConnectionState.LOADING,
  l1NetworkChainId: null,
  l2NetworkChainId: null,
  verifying: WhiteListState.ALLOWED,
  selectedToken: null,
  isDepositMode: true,
  sortedTransactions: derived((s: AppState) => {
    const transactions = s.arbTokenBridge?.transactions?.transactions || []
    const account = getAccount()
    if (!account.address) {
      return []
    }

    return filterTransactions(
      [...transactions],
      account.address,
      s.l1NetworkChainId,
      s.l2NetworkChainId
    )
  }),
  pendingTransactions: derived((s: AppState) => {
    return s.sortedTransactions.filter(tx => tx.status === 'pending')
  }),
  l1DepositsWithUntrackedL2Messages: derived((s: AppState) => {
    // check 'deposit' and 'deposit-l1' for backwards compatibility with old client side cache
    return s.sortedTransactions.filter(
      (txn: Transaction) =>
        (txn.type === 'deposit' || txn.type === 'deposit-l1') &&
        txn.status === 'success' &&
        (!txn.l1ToL2MsgData ||
          (txn.l1ToL2MsgData.status === L1ToL2MessageStatus.NOT_YET_CREATED &&
            !txn.l1ToL2MsgData.fetchingUpdate))
    )
  }),
  failedRetryablesToRedeem: derived((s: AppState) => {
    return s.depositsTransformed.filter(
      tx => tx.depositStatus === DepositStatus.L2_FAILURE
    )
  }),
  depositsTransformed: derived((s: AppState) => {
    return transformDeposits(
      s.sortedTransactions.filter(
        // only take the deposit transactions, rest `outbox`, `approve` etc should not come
        tx => tx.type === 'deposit' || tx.type === 'deposit-l1'
      )
    )
  }),
  withdrawalsTransformed: derived((s: AppState) => {
    const withdrawals = Object.values(
      s.arbTokenBridge?.pendingWithdrawalsMap || []
    ) as L2ToL1EventResultPlus[]

    return transformWithdrawals(withdrawals)
  }),
  mergedTransactions: derived((s: AppState) => {
    return _reverse(
      _sortBy([...s.depositsTransformed, ...s.withdrawalsTransformed], item => {
        if (_isEmpty(item.createdAt)) {
          return -1
        }
        return dayjs(item.createdAt).unix() // numeric format
      })
    )
  }),
  arbTokenBridgeLoaded: false
}
export const state: AppState = {
  ...defaultState
}
