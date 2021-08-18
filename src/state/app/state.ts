import { Bridge } from 'arb-ts'
import { ConnectionState, PendingWithdrawalsLoadedState } from '../../util'
import Networks, { Network } from '../../components/App/networks'
import { derived } from 'overmind'
import { ArbTokenBridge } from '../../types/ArbTokenBridge'

export enum WhiteListState {
  VERIFYING,
  ALLOWED,
  DISALLOWED
}

export type AppState = {
  bridge: Bridge | null
  arbTokenBridge: ArbTokenBridge
  connectionState: ConnectionState
  networkID: string | null
  verifying: WhiteListState

  networkDetails: Network | null
  l1NetworkDetails: Network | null
  l2NetworkDetails: Network | null

  pwLoadedState: PendingWithdrawalsLoadedState
  arbTokenBridgeLoaded: boolean
}

export const defaultState: AppState = {
  bridge: null,
  arbTokenBridge: {} as ArbTokenBridge,
  connectionState: ConnectionState.LOADING,
  networkID: null,
  verifying: WhiteListState.VERIFYING,

  networkDetails: derived((s: AppState) => {
    if (!s.networkID) return null
    else return Networks[s.networkID]
  }),
  l1NetworkDetails: derived((s: AppState) => {
    const network = s.networkDetails
    if (!network) {
      return null
    }
    if (!network.isArbitrum) {
      return network
    } else {
      return Networks[network.partnerChainID]
    }
  }),
  l2NetworkDetails: derived((s: AppState) => {
    const network = s.networkDetails
    if (!network) {
      return null
    }
    if (network.isArbitrum) {
      return network
    } else {
      return Networks[network.partnerChainID]
    }
  }),

  pwLoadedState: PendingWithdrawalsLoadedState.LOADING,
  arbTokenBridgeLoaded: false
}
export const state: AppState = {
  ...defaultState
}
