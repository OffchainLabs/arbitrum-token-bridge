import { Bridge, L2ToL1EventResult } from 'arb-ts'
import { derived } from 'overmind'
import {
  ArbTokenBridge,
  BridgeToken,
  L2ToL1EventResultPlus,
  Transaction
} from 'token-bridge-sdk'

import { ConnectionState, PendingWithdrawalsLoadedState } from '../../util'
import Networks, { Network } from '../../util/networks'

export enum WhiteListState {
  VERIFYING,
  ALLOWED,
  DISALLOWED
}

export interface MergedTransaction {
  direction: string
  status: string
  createdAt?: string
  txId: string
  asset: string
  value: string | null
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
  pendingTransactionsUpdated: boolean
  mergedTransactions: MergedTransaction[]

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
  verifying: WhiteListState.VERIFYING,
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
  pendingTransactionsUpdated: false,
  mergedTransactions: derived((s: AppState) => {
    const deposit: MergedTransaction[] = s.sortedTransactions.map(tx => {
      return {
        direction: tx.type,
        status: tx.status,
        createdAt: tx.timestampCreated?.toString(),
        txId: tx.txID,
        asset: tx.assetName,
        value: tx.value
      }
    })
    const withdraw: MergedTransaction[] = (
      Object.values(
        s.arbTokenBridge?.pendingWithdrawalsMap || []
      ) as L2ToL1EventResultPlus[]
    ).map(tx => {
      return {
        direction: 'outbox',
        status: `${tx.outgoingMessageState}`,
        createdAt: tx.timestamp,
        txId: tx.uniqueId?.toString(),
        asset: tx.type?.toLocaleLowerCase(),
        value: tx.value?.toString()
      }
    })
    return [...withdraw, ...deposit]
  }),

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
