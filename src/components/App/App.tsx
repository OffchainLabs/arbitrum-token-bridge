import React, { createContext, useContext, useEffect, useState } from 'react'

import { LogLevel } from '@ethersproject/logger'
import { Web3Provider } from '@ethersproject/providers'
import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { useWeb3React, Web3ReactProvider } from '@web3-react/core'
import { InjectedConnector } from '@web3-react/injected-connector'
import { Bridge } from 'arb-ts'
import * as ethers from 'ethers'
import { BigNumber } from 'ethers'
import { hexValue, Logger } from 'ethers/lib/utils'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { ConnectionState } from 'src/util/index'

import { config, useActions, useAppState } from '../../state'
import networks, { Network } from '../../util/networks'
import { Alert } from '../common/Alert'
import { Layout } from '../common/Layout'
import MessageOverlay from '../common/MessageOverlay'
import { ConnectWarning } from '../ConnectWarning/ConnectWarning'
import MainContent from '../MainContent/MainContent'
import { AppTokenBridgeStoreSync } from '../syncers/AppTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { PendingTransactionsUpdater } from '../syncers/PendingTransactionsUpdater'
import { PWLoadedUpdater } from '../syncers/PWLoadedUpdater'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { WhiteListUpdater } from '../syncers/WhiteListUpdater'

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
    return <ConnectWarning />
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
          <PendingTransactionsUpdater />
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
    if (provider) {
      const changeNetwork = async (chainId: string) => {
        const hexChainId = hexValue(BigNumber.from(chainId))
        const metamask = await provider?.getProvider()
        await metamask?.request({
          method: 'wallet_switchEthereumChain',
          params: [
            {
              chainId: hexChainId // A 0x-prefixed hexadecimal string
            }
          ]
        })
      }
      actions.app.setChangeNetwork(changeNetwork)
    }
  }, [provider])

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
  }

  // reset bridge on network switch, this inits all other resets
  useEffect(() => {
    if (!active) {
      return
    }

    if (globalBridge) {
      setGlobalBridge(null)
    }
  }, [networkVersion])

  // after bridge is set to null, we start recreating everything
  useEffect(() => {
    if (!active || globalBridge) {
      return
    }

    actions.app.reset()

    // if (globalBridge) {
    //   const network = networks[`${networkVersion}`]
    //   // globalBridge.l1Bridge.l1Signer = getL1Signer(network)
    //   // globalBridge.l2Bridge.l2Signer = getL2Signer(network)
    //   globalBridge.l1Bridge = new L1Bridge(
    //     network.tokenBridge.l1Address,
    //     getL1Signer(network)
    //   )
    //   globalBridge.l2Bridge = new L2Bridge(
    //     network.tokenBridge.l2Address,
    //     getL2Signer(network)
    //   )
    //   return
    // }

    try {
      if (!provider || !networkVersion || !library) {
        actions.app.setConnectionState(ConnectionState.NO_METAMASK)
        return
      }

      initBridge()
    } catch (e) {
      console.log(e)
      actions.app.setConnectionState(ConnectionState.NO_METAMASK)
    }
  }, [globalBridge, active, networkVersion])

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

function getLibrary(provider: any): Web3Provider {
  Logger.setLogLevel(LogLevel.ERROR)

  const library = new Web3Provider(provider)
  // const library = new Web3Provider(provider)
  library.pollingInterval = 2000
  return library
}

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
