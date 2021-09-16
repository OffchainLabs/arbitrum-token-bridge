import { Bridge } from 'arb-ts'
import { ArbTokenBridge, BridgeToken } from 'token-bridge-sdk'

import { Context } from '..'
import { ConnectionState, PendingWithdrawalsLoadedState } from '../../util'
import { WhiteListState } from './state'

export const setConnectionState = (
  { state }: Context,
  connectionState: ConnectionState
) => {
  state.app.connectionState = connectionState
}

export const setBridge = ({ state }: Context, bridge: Bridge) => {
  state.app.bridge = bridge
}

export const setCurrentL1BlockNumber = (
  { state }: Context,
  blockNum: number
) => {
  state.app.currentL1BlockNumber = blockNum
}

export const setPendingTransactionsUpdated = (
  { state }: Context,
  updated: boolean
) => {
  state.app.pendingTransactionsUpdated = updated
}

export const setNetworkID = ({ state }: Context, networkID: string) => {
  state.app.networkID = networkID
}

export const setIsDepositMode = (
  { state }: Context,
  isDepositMode: boolean
) => {
  state.app.isDepositMode = isDepositMode
}

export const setSelectedToken = (
  { state }: Context,
  token: BridgeToken | null
) => {
  state.app.selectedToken = token ? { ...token } : null
}

export const setChangeNetwork = (
  { state }: Context,
  func: (chainID: string) => Promise<void>
) => {
  state.app.changeNetwork = func
}

export const reset = ({ state }: Context, newChainId: string) => {
  if (
    state.app.l1NetworkDetails?.chainID !== newChainId &&
    state.app.l2NetworkDetails?.chainID !== newChainId
  ) {
    // only reset the selected token if we are not switching between the pair of l1-l2 networks.
    // we dont want to reset the token if we are switching from Rinkeby to Rinkarby for example
    // because we are maybe in the process of auto switching the network and triggering deposit or withdraw
    state.app.selectedToken = null
  }
  state.app.arbTokenBridge = {} as ArbTokenBridge
  state.app.verifying = WhiteListState.ALLOWED
  state.app.connectionState = ConnectionState.LOADING
  state.app.arbTokenBridgeLoaded = false
  state.app.pendingTransactionsUpdated = false
  state.app.pwLoadedState = PendingWithdrawalsLoadedState.LOADING
}

export const setPWLoadingState = (
  { state }: Context,
  pwLoadingState: PendingWithdrawalsLoadedState
) => {
  state.app.pwLoadedState = pwLoadingState
}

export const setWhitelistState = (
  { state }: Context,
  verifying: WhiteListState
) => {
  state.app.verifying = verifying
}

export const setArbTokenBridgeLoaded = (
  { state }: Context,
  loaded: boolean
) => {
  state.app.arbTokenBridgeLoaded = loaded
}

export const setArbTokenBridge = (
  { state, actions }: Context,
  atb: ArbTokenBridge
) => {
  state.app.arbTokenBridge = atb
  if (atb && !state.app.arbTokenBridgeLoaded) {
    actions.app.setArbTokenBridgeLoaded(true)
  }
}
