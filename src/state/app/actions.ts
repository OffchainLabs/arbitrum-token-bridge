import { Context } from '..'
import {
  ConnectionState,
  getInjectedWeb3,
  PendingWithdrawalsLoadedState,
  setChangeListeners
} from '../../util'
import networks from '../../components/App/networks'
import * as ethers from 'ethers'
import { Bridge } from 'arb-ts'
import { WhiteListState } from './state'
import { ArbTokenBridge } from '../../types/ArbTokenBridge'

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

export const updateConnectionState = ({ state, actions }: Context) => {
  if (state.app.connectionState === ConnectionState.LOADING) {
    try {
      getInjectedWeb3().then(([provider, networkVersion]) => {
        console.log('getInjectedWeb3', provider, networkVersion)
        if (!provider) {
          return actions.app.setConnectionState(ConnectionState.NO_METAMASK)
        }
        if (!networkVersion) {
          return actions.app.setConnectionState(ConnectionState.NO_METAMASK)
        }

        actions.app.setNetworkID(networkVersion)
        setChangeListeners()

        if (window.location.hash === '#info') {
          return actions.app.setConnectionState(ConnectionState.WRONG_NETWORK)
        }

        const network = networks[networkVersion]
        if (!network) {
          console.warn('WARNING: unsupported network')
          return actions.app.setConnectionState(ConnectionState.WRONG_NETWORK)
        }

        const partnerNetwork = networks[network.partnerChainID]
        // if(network.chainID === '1' || partnerNetwork.chainID === '1'){
        //   return setConnectionState(ConnectionState.SEQUENCER_UPDATE)
        // }
        if (!network.isArbitrum) {
          console.info('deposit mode detected')
          const ethProvider = provider
          const arbProvider = new ethers.providers.JsonRpcProvider(
            partnerNetwork.url
          )

          const l1Signer = ethProvider.getSigner(0)
          const l2Signer = arbProvider.getSigner(
            window.ethereum?.selectedAddress
          )
          Bridge.init(
            l1Signer,
            l2Signer,
            network.tokenBridge.l1Address,
            network.tokenBridge.l2Address
          ).then(bridge => {
            console.log('DEPOSIT BRIDGE', bridge)
            actions.app.setBridge(bridge)
            actions.app.setConnectionState(ConnectionState.DEPOSIT_MODE)
          })
        } else {
          console.info('withdrawal mode detected')
          const ethProvider = new ethers.providers.JsonRpcProvider(
            partnerNetwork.url
          )
          const arbProvider = provider
          const l1Signer = ethProvider.getSigner(
            window.ethereum?.selectedAddress
          )
          const l2Signer = arbProvider.getSigner(0)
          Bridge.init(
            l1Signer,
            l2Signer,
            network.tokenBridge.l1Address,
            network.tokenBridge.l2Address
          ).then(bridge => {
            actions.app.setBridge(bridge)
            actions.app.setConnectionState(ConnectionState.WITHDRAW_MODE)
          })
        }
      })
    } catch (e) {
      console.log(e)
      actions.app.setConnectionState(ConnectionState.NO_METAMASK)
    }
  }
}
