import { Bridge } from 'arb-ts'

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
  if (atb) {
    actions.app.setArbTokenBridgeLoaded(true)
  }
}
