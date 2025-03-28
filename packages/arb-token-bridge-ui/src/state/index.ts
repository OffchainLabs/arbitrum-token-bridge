import { useAppStore } from './app/state'

// For backwards compatibility with previous Overmind state
export const useAppState = () => {
  const store = useAppStore()
  return {
    app: {
      arbTokenBridge: store.arbTokenBridge,
      warningTokens: store.warningTokens,
      l1NetworkChainId: store.l1NetworkChainId,
      l2NetworkChainId: store.l2NetworkChainId,
      arbTokenBridgeLoaded: store.arbTokenBridgeLoaded
    }
  }
}

export const useActions = () => {
  const store = useAppStore()
  return {
    app: {
      setChainIds: store.setChainIds,
      reset: store.reset,
      setWarningTokens: store.setWarningTokens,
      setArbTokenBridgeLoaded: store.setArbTokenBridgeLoaded,
      setArbTokenBridge: store.setArbTokenBridge
    }
  }
}
