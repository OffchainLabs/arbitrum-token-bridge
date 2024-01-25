import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types'
import { SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID } from './TokenListUtils'

export function isArbitrumToken(token: ERC20BridgeToken | null) {
  if (!token) {
    return false
  }

  return token.listIds.has(SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID)
}
