import { ArbTokenBridge } from '../../hooks/arbTokenBridge.types'
import { Context } from '..'
import { ConnectionState } from '../../util'
import { WarningTokens } from './state'

export const setConnectionState = (
  { state }: Context,
  connectionState: ConnectionState
) => {
  state.app.connectionState = connectionState
}

export const setChainIds = (
  { state }: Context,
  payload: { l1NetworkChainId: number; l2NetworkChainId: number }
) => {
  state.app.l1NetworkChainId = payload.l1NetworkChainId
  state.app.l2NetworkChainId = payload.l2NetworkChainId
}

export const reset = ({ state }: Context) => {
  state.app.arbTokenBridge = {} as ArbTokenBridge
  state.app.connectionState = ConnectionState.LOADING
  state.app.arbTokenBridgeLoaded = false
}

export const setWarningTokens = (
  { state }: Context,
  warningTokens: WarningTokens
) => {
  state.app.warningTokens = warningTokens
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
