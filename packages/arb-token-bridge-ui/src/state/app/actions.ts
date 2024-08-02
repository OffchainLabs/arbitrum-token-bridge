import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { Context } from '..'
import { ConnectionState } from '../../util'
import { WarningTokens } from './state'

export const setConnectionState = (
  { state }: Context,
  connectionState: ConnectionState
) => {
  state.app.connectionState = connectionState
}

export const setSelectedToken = (
  { state }: Context,
  token: ERC20BridgeToken | null
) => {
  state.app.selectedToken = token ? { ...token } : null
}

export const setWarningTokens = (
  { state }: Context,
  warningTokens: WarningTokens
) => {
  state.app.warningTokens = warningTokens
}
