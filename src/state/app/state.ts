import { Bridge, OutgoingMessageState } from 'arb-ts'
import dayjs from 'dayjs'
import { ethers, BigNumber } from 'ethers'
import _isEmpty from 'lodash/isEmpty'
import _reverse from 'lodash/reverse'
import _sortBy from 'lodash/sortBy'
import { derived } from 'overmind'
import {
  ArbTokenBridge,
  BridgeToken,
  L2ToL1EventResultPlus,
  Transaction,
  TxnType
} from 'token-bridge-sdk'

import { ConnectionState, PendingWithdrawalsLoadedState } from '../../util'
import Networks, { Network } from '../../util/networks'

export enum WhiteListState {
  VERIFYING,
  ALLOWED,
  DISALLOWED
}
interface SeqNumToTxn {
  [seqNum: number]: MergedTransaction
}
export interface MergedTransaction {
  direction: TxnType
  status: string
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
}

const outgoungStateToString = {
  [OutgoingMessageState.NOT_FOUND]: 'Not Found',
  [OutgoingMessageState.UNCONFIRMED]: 'Unconfirmed',
  [OutgoingMessageState.CONFIRMED]: 'Confirmed',
  [OutgoingMessageState.EXECUTED]: 'Executed'
}

export type AppState = {
  bridge: Bridge | null
  arbTokenBridge: ArbTokenBridge
  connectionState: number
  networkID: string | null
  verifying: WhiteListState
  selectedToken: BridgeToken | null
  isDepositMode: boolean
  sortedTransactions: Transaction[]
  pendingTransactions: Transaction[]
  successfulL1Deposits: Transaction[]
  depositsTransformed: MergedTransaction[]
  withdrawalsTransformed: MergedTransaction[]
  mergedTransactions: MergedTransaction[]
  mergedTransactionsToShow: MergedTransaction[]
  seqNumToAutoRedeems: SeqNumToTxn
  currentL1BlockNumber: number

  networkDetails: Network | null
  l1NetworkDetails: Network | null
  l2NetworkDetails: Network | null

  pwLoadedState: PendingWithdrawalsLoadedState
  arbTokenBridgeLoaded: boolean

  changeNetwork: ((chainId: string) => Promise<void>) | null
}

export const defaultState: AppState = {
  bridge: null,
  arbTokenBridge: {} as ArbTokenBridge,
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
        seqNum: tx.seqNum
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
        direction: 'withdraw',
        status: outgoungStateToString[tx.outgoingMessageState],
        createdAt: dayjs(
          new Date(BigNumber.from(tx.timestamp).toNumber() * 1000)
        ).format('HH:mm:ss MM/DD/YYYY'),
        createdAtTime: BigNumber.from(tx.timestamp).toNumber() * 1000,
        resolvedAt: null,
        txId: tx.uniqueId?.toString(),
        asset: tx.symbol?.toLocaleLowerCase(),
        value: ethers.utils.formatUnits(tx.value?.toString(), tx.decimals),
        uniqueId: tx.uniqueId,
        isWithdrawal: true,
        blockNum: tx.ethBlockNum.toNumber(),
        tokenAddress: tx.tokenAddress || null
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
    // group ticket-created by seqNum so we can match thyarnem with deposit-l2 txns later
    const seqNumToTicketCreation: SeqNumToTxn = {}

    s.mergedTransactions.forEach(txn => {
      const { seqNum, direction } = txn
      if (direction === 'deposit-l2-ticket-created' && seqNum) {
        seqNumToTicketCreation[seqNum as number] = txn
      }
    })
    return s.mergedTransactions.filter((txn: MergedTransaction) => {
      const { asset, direction, status, seqNum } = txn
      // I don't like having to string check here; I'd like to bring over the AssetType enum into mergedtransaction
      if (txn.asset !== 'eth') {
        switch (txn.direction) {
          case 'deposit-l2-ticket-created': {
            // show only if it fails
            return status === 'failure'
          }
          case 'deposit-l2-auto-redeem': {
            // show only if it fails
            return status === 'failure'
          }
          case 'deposit-l2': {
            // show unless the ticket creation failed
            const ticketCreatedTxn = seqNumToTicketCreation[seqNum as number]
            return !(ticketCreatedTxn && ticketCreatedTxn.status === 'failure')
          }

          default:
            break
        }
      }
      return true
    })
  }),
  seqNumToAutoRedeems: derived((s: AppState) => {
    const seqNumToTicketCreation: SeqNumToTxn = {}

    s.mergedTransactions.forEach(txn => {
      const { seqNum, direction } = txn
      if (direction === 'deposit-l2-auto-redeem' && seqNum) {
        seqNumToTicketCreation[seqNum as number] = txn
      }
    })
    return seqNumToTicketCreation
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
