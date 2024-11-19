import { create } from 'zustand'
import { ContractStorage, ERC20BridgeToken } from './arbTokenBridge.types'

type BridgeTokens = ContractStorage<ERC20BridgeToken> | undefined
type BridgeTokensStore = {
  bridgeTokens: BridgeTokens
  setBridgeTokens: (
    fn: (prevBridgeTokens: BridgeTokens) => BridgeTokens
  ) => void
}
export const useBridgeTokensStore = create<BridgeTokensStore>(set => ({
  bridgeTokens: undefined,
  setBridgeTokens: fn => {
    set(state => ({ bridgeTokens: fn(state.bridgeTokens) }))
  }
}))
