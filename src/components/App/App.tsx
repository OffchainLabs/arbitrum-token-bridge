import React, { createContext, useContext, useEffect, useState } from 'react'

import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { useWallet } from '@gimmixorg/use-wallet'
// @ts-ignore
import MewConnect from '@myetherwallet/mewconnect-web-client'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { Bridge } from 'arb-ts'
import Authereum from 'authereum'
import * as ethers from 'ethers'
import { BigNumber } from 'ethers'
import { hexValue } from 'ethers/lib/utils'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom'
import { ConnectionState } from 'src/util/index'

import { config, useActions, useAppState } from '../../state'
import networks, { Network } from '../../util/networks'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Layout } from '../common/Layout'
import MessageOverlay from '../common/MessageOverlay'
import MainContent from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { CurrentL1BlockNumberUpdater } from '../syncers/CurrentL1BlockNumberUpdater'
import { PendingTransactionsUpdater } from '../syncers/PendingTransactionsUpdater'
import { PWLoadedUpdater } from '../syncers/PWLoadedUpdater'
import { RetryableTxnsIncluder } from '../syncers/RetryableTxnsIncluder'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { TermsOfService } from '../TermsOfService/TermsOfService'

const modalProviderOpts = {
  cacheProvider: false, // optional
  providerOptions: {
    mewconnect: {
      package: MewConnect,
      options: {
        infuraId: process.env.REACT_APP_INFURA_KEY // required
      }
    },
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        infuraId: process.env.REACT_APP_INFURA_KEY // required
      }
    },
    authereum: {
      package: Authereum
    }
  }
}

const NoMetamaskIndicator = (): JSX.Element => {
  const { connect } = useWallet()

  function showConnectionModal() {
    connect(modalProviderOpts)
  }

  useEffect(() => {
    showConnectionModal()
  }, [])

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-center mb-4">
        <Alert type="blue">Ethereum provider not detected, please login.</Alert>
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
      <div className="flex justify-center">
        <Button
          onClick={() => showConnectionModal()}
          type="button"
          className="px-12"
        >
          Login
        </Button>
      </div>
    </div>
  )
}

export const BridgeContext = createContext<Bridge | null>(null)

const AppContent = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const {
    app: { connectionState }
  } = useAppState()

  if (connectionState === ConnectionState.NO_METAMASK) {
    return <NoMetamaskIndicator />
  }
  if (connectionState === ConnectionState.WRONG_NETWORK) {
    return (
      <div>
        <div className="mb-4">
          You are on the wrong network. Read our tutorial bellow on how to
          switch networks.
        </div>
        <iframe
          title="Bridge Tutorial"
          src="https://arbitrum.io/bridge-tutorial/"
          width="100%"
          height={500}
        />
      </div>
    )
    // return <ConnectWarning />
  }
  if (connectionState === ConnectionState.SEQUENCER_UPDATE) {
    return (
      <Alert type="red">
        Note: The Arbitrum Sequencer Will be offline today 3pm-5pm EST for
        maintenance. Thanks for your patience!
      </Alert>
    )
  }

  return (
    <>
      {bridge && (
        <>
          <CurrentL1BlockNumberUpdater />
          <PendingTransactionsUpdater />
          <RetryableTxnsIncluder />
          <BalanceUpdater />
          <PWLoadedUpdater />
          <TokenListSyncer />
        </>
      )}

      <MessageOverlay />

      <MainContent />
    </>
  )
}

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const actions = useActions()

  const [globalBridge, setGlobalBridge] = useState<Bridge | null>(null)

  const {
    account: usersMetamaskAddress,
    provider: library,
    network: networkInfo
  } = useWallet()
  const networkVersion = networkInfo?.chainId

  useEffect(() => {
    if (library) {
      const changeNetwork = async (chainId: string) => {
        const hexChainId = hexValue(BigNumber.from(chainId))
        const metamask = library?.provider
        if (metamask !== undefined && metamask.isMetaMask) {
          // @ts-ignore
          await metamask.request({
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId: hexChainId // A 0x-prefixed hexadecimal string
              }
            ]
          })
        }
      }
      actions.app.setChangeNetwork(changeNetwork)
    }
  }, [library])

  async function initBridge(): Promise<Bridge | undefined> {
    function getL1Signer(network: Network) {
      if (network.isArbitrum) {
        const partnerNetwork = networks[network.partnerChainID]
        const ethProvider = new ethers.providers.JsonRpcProvider(
          partnerNetwork.url
        )
        return ethProvider.getSigner(usersMetamaskAddress!)
      }
      return library?.getSigner(0) as JsonRpcSigner
    }

    function getL2Signer(network: Network) {
      if (network.isArbitrum) {
        return library?.getSigner(0) as JsonRpcSigner
      }
      const partnerNetwork = networks[network.partnerChainID]

      const arbProvider = new ethers.providers.JsonRpcProvider(
        partnerNetwork.url
      )

      return arbProvider.getSigner(usersMetamaskAddress!)
    }

    actions.app.setNetworkID(`${networkVersion}`)

    const network = networks[`${networkVersion}`]
    if (!network) {
      console.warn('WARNING: unsupported network')
      actions.app.setConnectionState(ConnectionState.WRONG_NETWORK)
      return
    }

    const l1Signer = getL1Signer(network)
    const l2Signer = getL2Signer(network)
    console.info('Initializing bridge!!!')
    const bridge = await Bridge.init(
      l1Signer,
      l2Signer,
      network.tokenBridge.l1Address,
      network.tokenBridge.l2Address
    )
    setGlobalBridge(bridge)
    if (!network.isArbitrum) {
      console.info('deposit mode detected')
      actions.app.setConnectionState(ConnectionState.DEPOSIT_MODE)
    } else {
      console.info('withdrawal mode detected')
      actions.app.setConnectionState(ConnectionState.WITHDRAW_MODE)
    }

    console.log('Gas price', await library?.getGasPrice())
  }

  // STEP1 reset bridge on network switch or account switch, this inits all other resets
  useEffect(() => {
    if (!usersMetamaskAddress) {
      return
    }

    if (globalBridge) {
      setGlobalBridge(null)
    }
  }, [networkVersion, usersMetamaskAddress])

  // STEP2 after bridge is set to null, we start recreating everything
  useEffect(() => {
    if (globalBridge) {
      return
    }

    actions.app.reset()

    try {
      if (!networkVersion || !library) {
        actions.app.setConnectionState(ConnectionState.NO_METAMASK)
        return
      }

      initBridge()
    } catch (e) {
      console.log(e)
      actions.app.setConnectionState(ConnectionState.NO_METAMASK)
    }
  }, [globalBridge, networkVersion])

  return (
    <>
      {globalBridge && <ArbTokenBridgeStoreSync bridge={globalBridge} />}
      <BridgeContext.Provider value={globalBridge}>
        {children}
      </BridgeContext.Provider>
    </>
  )
}

function Routes() {
  return (
    <Router>
      <Switch>
        <Route path="/tos">
          <TermsOfService />
        </Route>
        <Route path="/">
          <AppContent />
        </Route>
      </Switch>
    </Router>
  )
}

const App = (): JSX.Element => {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))
  return (
    <Provider value={overmind}>
      <Layout>
        <Injector>
          <Routes />
        </Injector>
      </Layout>
    </Provider>
  )
}

export default App
