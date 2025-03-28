import { ArbTokenBridge } from '../../hooks/arbTokenBridge.types'
import { Context } from '..'
import { WarningTokens } from './state'
import { useAppStore } from './state'

export const setChainIds = (
  { state }: Context,
  payload: { l1NetworkChainId: number; l2NetworkChainId: number }
) => {
  useAppStore.getState().setChainIds(payload)
}

export const reset = ({ state }: Context) => {
  useAppStore.getState().reset()
}

export const setWarningTokens = (
  { state }: Context,
  warningTokens: WarningTokens
) => {
  useAppStore.getState().setWarningTokens(warningTokens)
}

export const setArbTokenBridgeLoaded = (
  { state }: Context,
  loaded: boolean
) => {
  useAppStore.getState().setArbTokenBridgeLoaded(loaded)
}

export const setArbTokenBridge = (
  { state, actions }: Context,
  atb: ArbTokenBridge
) => {
  useAppStore.getState().setArbTokenBridge(atb)
}
