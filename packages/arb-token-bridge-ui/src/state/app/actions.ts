import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { Context } from '..'
import { ConnectionState } from '../../util'
import { WhiteListState, WarningTokens } from './state'

export const setConnectionState = (
  { state }: Context,
  connectionState: ConnectionState
) => {
  state.app.connectionState = connectionState
}

export const setChainIds = (
  { state }: Context,
  payload: { sourceChainId: number; destinationChainId: number }
) => {
  state.app.sourceChainId = payload.sourceChainId
  state.app.destinationChainId = payload.destinationChainId
}

export const setSelectedToken = (
  { state }: Context,
  token: ERC20BridgeToken | null
) => {
  state.app.selectedToken = token ? { ...token } : null
}

export const reset = ({ state }: Context, newChainId: number) => {
  if (
    state.app.sourceChainId !== newChainId &&
    state.app.destinationChainId !== newChainId
  ) {
    // only reset the selected token if we are not switching between the pair of l1-l2 networks.
    // we dont want to reset the token if we are switching from Goerli to Arbitrum Goerli for example
    // because we are maybe in the process of auto switching the network and triggering deposit or withdraw
    state.app.selectedToken = null
  }

  state.app.verifying = WhiteListState.ALLOWED
  state.app.connectionState = ConnectionState.LOADING
}

export const setWarningTokens = (
  { state }: Context,
  warningTokens: WarningTokens
) => {
  state.app.warningTokens = warningTokens
}

export const setWhitelistState = (
  { state }: Context,
  verifying: WhiteListState
) => {
  state.app.verifying = verifying
}
