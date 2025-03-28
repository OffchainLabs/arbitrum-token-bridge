import { ArbTokenBridge } from '../../hooks/arbTokenBridge.types'
import { WarningTokens } from './state'
import { useAppStore } from './state'

export const setChainIds = (payload: {
  l1NetworkChainId: number
  l2NetworkChainId: number
}) => {
  useAppStore.getState().setChainIds(payload)
}

export const reset = () => {
  useAppStore.getState().reset()
}

export const setWarningTokens = (warningTokens: WarningTokens) => {
  useAppStore.getState().setWarningTokens(warningTokens)
}

export const setArbTokenBridgeLoaded = (loaded: boolean) => {
  useAppStore.getState().setArbTokenBridgeLoaded(loaded)
}

export const setArbTokenBridge = (atb: ArbTokenBridge) => {
  useAppStore.getState().setArbTokenBridge(atb)
}
