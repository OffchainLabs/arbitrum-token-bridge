import { ArbTokenBridge, ERC20BridgeToken } from 'token-bridge-sdk'

import { Context } from '..'
import { ConnectionState, PendingWithdrawalsLoadedState } from '../../util'
import { WhiteListState, WarningTokens } from './state'
import { ChangeNetworkProps } from '../../components/App/App'

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

export const setIsDepositMode = (
  { state }: Context,
  isDepositMode: boolean
) => {
  state.app.isDepositMode = isDepositMode
}

export const setSelectedToken = (
  { state }: Context,
  token: ERC20BridgeToken | null
) => {
  state.app.selectedToken = token ? { ...token } : null
}

export const setChangeNetwork = (
  { state }: Context,
  func: ({ chainId, onSuccess, onError }: ChangeNetworkProps) => Promise<void>
) => {
  state.app.changeNetwork = func
}

export const reset = ({ state }: Context, newChainId: number) => {
  if (
    state.app.l1NetworkChainId !== newChainId &&
    state.app.l2NetworkChainId !== newChainId
  ) {
    // only reset the selected token if we are not switching between the pair of l1-l2 networks.
    // we dont want to reset the token if we are switching from Rinkeby to Rinkarby for example
    // because we are maybe in the process of auto switching the network and triggering deposit or withdraw
    state.app.selectedToken = null
  }

  state.app.arbTokenBridge = {} as ArbTokenBridge
  state.app.verifying = WhiteListState.ALLOWED
  state.app.connectionState = ConnectionState.LOADING
  state.app.arbTokenBridgeLoaded = false
  state.app.pwLoadedState = PendingWithdrawalsLoadedState.LOADING
}

export const setWarningTokens = (
  { state }: Context,
  warningTokens: WarningTokens
) => {
  state.app.warningTokens = warningTokens
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

export const getPendingTransactions = ({ state }: Context) => {
  return state.app.pendingTransactions
}

export const l1DepositsWithUntrackedL2Messages = ({ state }: Context) => {
  return state.app.l1DepositsWithUntrackedL2Messages
}

export const getSortedTransactions = ({ state }: Context) => {
  return state.app.sortedTransactions
}

export const getFailedRetryablesToRedeem = ({ state }: Context) => {
  return state.app.failedRetryablesToRedeem
}
