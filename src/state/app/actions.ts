import { Bridge } from 'arb-ts'
import { BridgeToken } from 'token-bridge-sdk'

import { Context } from '..'
import { ArbTokenBridge } from '../../types/ArbTokenBridge'
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

export const reset = ({ state }: Context) => {
  state.app.verifying = WhiteListState.ALLOWED
  state.app.connectionState = ConnectionState.LOADING
  state.app.arbTokenBridgeLoaded = false
  state.app.arbTokenBridge = {} as ArbTokenBridge
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
