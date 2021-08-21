import React, { createContext, useEffect, useState } from 'react'

import { Logger, LogLevel } from '@ethersproject/logger'
import { Web3Provider } from '@ethersproject/providers'
import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { useWeb3React, Web3ReactProvider } from '@web3-react/core'
import { InjectedConnector } from '@web3-react/injected-connector'
import { Bridge } from 'arb-ts'
import * as ethers from 'ethers'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import Loader from 'react-loader-spinner'
import {
  ConnectionState,
  getInjectedWeb3,
  setChangeListeners
} from 'src/util/index'

import { config, useActions, useAppState } from '../../state'
import { reset } from '../../state/app/actions'
import { WhiteListState } from '../../state/app/state'
import networks from '../../util/networks'
import { Alert } from '../common/Alert'
import { Layout } from '../common/Layout'
import { ConnectWarning } from '../ConnectWarning/ConnectWarning'
import MainContent from '../MainContent/MainContent'
import { AppTokenBridgeStoreSync } from '../syncers/AppTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { PWLoadedUpdater } from '../syncers/PWLoadedUpdater'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { WhiteListUpdater } from '../syncers/WhiteListUpdater'

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
        <img width="150" src="/images/metamask-fox.svg" alt="Metamask" />
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
    app: { connectionState, arbTokenBridgeLoaded, verifying, arbTokenBridge }
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

      if (verifying === WhiteListState.VERIFYING) {
        return (
          <div className="flex justify-center mb-4">
            <Alert type="blue">Verifying...</Alert>
          </div>
        )
      }
      if (verifying === WhiteListState.DISALLOWED) {
        return (
          <div className="flex justify-center mb-4">
            <Alert type="red">
              Stop! You are attempting to use Mainnet Beta with unapproved
              address {arbTokenBridge.walletAddress}! <br /> Switch to an
              approved address or connect to Rinkeby for our public testnet.
            </Alert>
          </div>
        )
      }
      return (
        <>
          <BalanceUpdater />
          <PWLoadedUpdater />
          <TokenListSyncer />

          <MainContent />
        </>
      )
    default:
      return <></>
  }
}

export const BridgeContext = createContext<Bridge | null>(null)

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const actions = useActions()

  const [globalBridge, setGlobalBridge] = useState<Bridge | null>(null)
  const {
    activate,
    library,
    account: usersMetamaskAddress,
    chainId: networkVersion,
    active,
    connector: provider
  } = useWeb3React<Web3Provider>()

  useEffect(() => {
    activate(new InjectedConnector({}), ex => {
      console.error('Could not login to metamask', ex)
      actions.app.setConnectionState(ConnectionState.NO_METAMASK)
    })
  }, [])

  useEffect(() => {
    if (!active) {
      return
    }

    actions.app.reset()
    setGlobalBridge(null)

    try {
      if (!provider || !networkVersion || !library) {
        actions.app.setConnectionState(ConnectionState.NO_METAMASK)
        return
      }

      actions.app.setNetworkID(`${networkVersion}`)
      // setChangeListeners()

      const network = networks[`${networkVersion}`]
      if (!network) {
        console.warn('WARNING: unsupported network')
        actions.app.setConnectionState(ConnectionState.WRONG_NETWORK)
        return
      }

      const partnerNetwork = networks[network.partnerChainID]
      // if(network.chainID === '1' || partnerNetwork.chainID === '1'){
      //   return setConnectionState(ConnectionState.SEQUENCER_UPDATE)
      // }
      if (!network.isArbitrum) {
        console.info('deposit mode detected')
        const arbProvider = new ethers.providers.JsonRpcProvider(
          partnerNetwork.url
        )

        const l1Signer = library?.getSigner(0) as JsonRpcSigner
        const l2Signer = arbProvider.getSigner(usersMetamaskAddress!)
        Bridge.init(
          l1Signer,
          l2Signer,
          network.tokenBridge.l1Address,
          network.tokenBridge.l2Address
        )
          .then(b => {
            setGlobalBridge(b)
            // actions.app.setBridge(b)
            actions.app.setConnectionState(ConnectionState.DEPOSIT_MODE)
          })
          .catch(ex => {
            console.log(ex)
          })
      } else {
        console.info('withdrawal mode detected')
        const ethProvider = new ethers.providers.JsonRpcProvider(
          partnerNetwork.url
        )

        const l1Signer = ethProvider.getSigner(usersMetamaskAddress!)
        const l2Signer = library?.getSigner(0) as JsonRpcSigner
        Bridge.init(
          l1Signer,
          l2Signer,
          network.tokenBridge.l1Address,
          network.tokenBridge.l2Address
        )
          .then(b => {
            setGlobalBridge(b)
            // actions.app.setBridge(b)
            actions.app.setConnectionState(ConnectionState.WITHDRAW_MODE)
          })
          .catch(ex => {
            console.log(ex)
          })
      }
    } catch (e) {
      console.log(e)
      actions.app.setConnectionState(ConnectionState.NO_METAMASK)
    }
  }, [networkVersion])

  return (
    <BridgeContext.Provider value={globalBridge}>
      <WhiteListUpdater
        bridge={globalBridge}
        walletAddress={usersMetamaskAddress}
        chainID={networkVersion}
      />

      {globalBridge && <AppTokenBridgeStoreSync bridge={globalBridge} />}
      {children}
    </BridgeContext.Provider>
  )
}
// Logger.setLogLevel(LogLevel.OFF)
function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(provider, 'any')
  // const library = new Web3Provider(provider)
  library.pollingInterval = 3000

  return library
}
// window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
//   console.log(`Error occured: ${errorMsg}`) // or any message
//   return false
// }
// window.onunhandledrejection = promiseRejectionEvent => {
//   console.log(`Error occured2: ${promiseRejectionEvent.reason}`) // or any message
//   promiseRejectionEvent.preventDefault()
//   promiseRejectionEvent.stopPropagation()
//   promiseRejectionEvent.stopImmediatePropagation()
// }

const App = (): JSX.Element => {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Provider value={overmind}>
        <Layout>
          <Injector>
            <AppContent />
          </Injector>
        </Layout>
      </Provider>
    </Web3ReactProvider>
  )
}

export default App
