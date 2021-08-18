import React, { useEffect, useState } from 'react'
import {
  ConnectionState,
  getInjectedWeb3,
  setChangeListeners
} from 'util/index'
import MainContent from './index'
import ModeContext from './ModeContext'
import NetworkIDContext from './NetworkContext'

import { Layout } from '../common/Layout'
import Loader from 'react-loader-spinner'
import { createOvermind, Overmind } from 'overmind'
import { config, useActions, useAppState } from '../../state'
import { Provider } from 'overmind-react'
import { ConnectWarning } from './ConnectWarning'
import { Alert } from '../common/Alert'
import { WhiteListUpdater } from './WhiteListUpdater'
import { BalanceUpdater } from './BalanceUpdater'
import { PWLoadedUpdater } from './PWLoadedUpdater'
import { AppTokenBridgeStoreSync } from './AppTokenBridgeStoreSync'
import networks from './networks'
import * as ethers from 'ethers'
import { Bridge } from 'arb-ts'

const LoadingIndicator = (): JSX.Element => (
  <div className="flex items-center justify-center mx-auto h-48">
    <Loader type="Oval" color="rgb(45, 55, 75)" height={32} width={32} />
  </div>
)

const NoMetamaskIndicator = (): JSX.Element => (
  <div className="container mx-auto px-4">
    <div className="flex justify-center mb-4">
      <Alert type="red">
        Ethereum provider not detected; make sure you have MetaMask connected.
      </Alert>
    </div>

    <div className="flex justify-center mb-4">
      <a
        href="https://metamask.io/download.html"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img width="150" src="/images/metamask-fox.svg" alt="Metamask Image" />
      </a>
    </div>
    <h4 className="text-center text-lg">
      <a
        href="https://metamask.io/download.html"
        target="_blank"
        rel="noopener noreferrer"
      >
        Install MetaMask
      </a>
    </h4>
  </div>
)

const AppContent = (): JSX.Element => {
  const {
    app: { connectionState, networkID, arbTokenBridgeLoaded }
  } = useAppState()

  switch (connectionState) {
    case ConnectionState.LOADING:
      return <LoadingIndicator />
    case ConnectionState.NO_METAMASK:
      return <NoMetamaskIndicator />
    case ConnectionState.WRONG_NETWORK:
      return <ConnectWarning />
    case ConnectionState.SEQUENCER_UPDATE:
      return (
        <Alert type="red">
          Note: The Arbitrum Sequencer Will be offline today 3pm-5pm EST for
          maintenance. Thanks for your patience!
        </Alert>
      )
    case ConnectionState.DEPOSIT_MODE:
    case ConnectionState.WITHDRAW_MODE:
      if (!arbTokenBridgeLoaded) {
        return <LoadingIndicator />
      }
      return (
        <>
          {arbTokenBridgeLoaded && (
            <>
              <WhiteListUpdater />
              <BalanceUpdater />
              <PWLoadedUpdater />
              <NetworkIDContext.Provider value={networkID || ''}>
                <ModeContext.Provider value={connectionState}>
                  <MainContent />
                </ModeContext.Provider>
              </NetworkIDContext.Provider>
            </>
          )}
        </>
      )
    default:
      return <></>
  }
}

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const {
    app: { connectionState }
  } = useAppState()
  const actions = useActions()
  const [globalBridge, setGlobalBridge] = useState<Bridge>()

  // useEffect(actions.app.updateConnectionState, [
  //   connectionState,
  //   window.ethereum
  // ])

  useEffect(() => {
    if (connectionState === ConnectionState.LOADING) {
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
              setGlobalBridge(bridge)
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
              setGlobalBridge(bridge)
              actions.app.setConnectionState(ConnectionState.WITHDRAW_MODE)
            })
          }
        })
      } catch (e) {
        console.log(e)
        actions.app.setConnectionState(ConnectionState.NO_METAMASK)
      }
    }
  }, [connectionState])

  // useEffect(actions.app.updateConnectionState, [])

  return (
    <>
      {globalBridge && <AppTokenBridgeStoreSync bridge={globalBridge} />}
      {children}
    </>
  )
}

const App = (): JSX.Element => {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  return (
    <Provider value={overmind}>
      <Layout>
        <Injector>
          <AppContent />
        </Injector>
      </Layout>
    </Provider>
  )
}

export default App
