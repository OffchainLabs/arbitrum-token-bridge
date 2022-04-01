import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { useWallet } from '@gimmixorg/use-wallet'
import axios from 'axios'
import { BigNumber } from 'ethers'
import { hexValue } from 'ethers/lib/utils'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom'
import { useLocalStorage } from 'react-use'
import { ConnectionState } from 'src/util/index'
import { Bridge, TokenBridgeParams } from 'token-bridge-sdk'

import { config, useActions, useAppState } from '../../state'
import { modalProviderOpts } from '../../util/modelProviderOpts'
import networks from '../../util/networks'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Layout } from '../common/Layout'
import MessageOverlay from '../common/MessageOverlay'
import { DisclaimerModal } from '../DisclaimerModal/DisclaimerModal'
import MainContent from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { CurrentL1BlockNumberUpdater } from '../syncers/CurrentL1BlockNumberUpdater'
import { PendingTransactionsUpdater } from '../syncers/PendingTransactionsUpdater'
import { PWLoadedUpdater } from '../syncers/PWLoadedUpdater'
import { RetryableTxnsIncluder } from '../syncers/RetryableTxnsIncluder'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { TermsOfService, TOS_VERSION } from '../TermsOfService/TermsOfService'

import { useNetworks, UseNetworksStatus } from '../../hooks/useNetworks'
import { useSigners, UseSignersStatus } from '../../hooks/useSigners'

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
          <img
            className="w-full max-w-96"
            src="/images/impact_transparent.png"
            alt="Wallet"
          />
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

async function addressIsEOA(_address: string, _signer: JsonRpcSigner) {
  return (await _signer.provider.getCode(_address)).length <= 2
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
  }

  if (connectionState === ConnectionState.SEQUENCER_UPDATE) {
    return (
      <Alert type="red">
        Note: The Arbitrum Sequencer Will be offline today 3pm-5pm EST for
        maintenance. Thanks for your patience!
      </Alert>
    )
  }

  if (connectionState === ConnectionState.NOT_EOA) {
    return (
      <Alert type="red">
        Looks like your wallet is connected to a contract; please connect to an
        externally owned account instead.
      </Alert>
    )
  }

  if (connectionState === ConnectionState.NETWORK_ERROR) {
    return (
      <Alert type="red">
        Error: unable to connect to network. Try again soon and contact{' '}
        <a
          rel="noreferrer"
          target="_blank"
          href="https://support.arbitrum.io/hc/en-us/requests/new"
        >
          <u>support</u>
        </a>{' '}
        if problem persists.
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

  const _networks = useNetworks()
  const _signers = useSigners()

  const [globalBridge, setGlobalBridge] = useState<Bridge | null>(null)
  const [tokenBridgeParams, setTokenBridgeParams] =
    useState<TokenBridgeParams | null>(null)

  const { provider: library } = useWallet()

  const initBridge = useCallback(
    async (signers: {
      l1Signer: JsonRpcSigner
      l2Signer: JsonRpcSigner
    }): Promise<Bridge | undefined> => {
      if (_networks.status !== UseNetworksStatus.CONNECTED) {
        return
      }

      const { l1Signer, l2Signer } = signers

      const l1Address = await l1Signer.getAddress()
      const l2Address = await l2Signer.getAddress()

      try {
        const l1AddressIsEOA = await addressIsEOA(l1Address, l1Signer)
        const l2AddressIsEOA = await addressIsEOA(l2Address, l2Signer)

        if (!l1AddressIsEOA || !l2AddressIsEOA) {
          actions.app.setConnectionState(ConnectionState.NOT_EOA)
          return undefined
        }
      } catch (err) {
        console.warn('CONNECTION ERROR', err)

        // The get code queries doubles as as network liveness check
        // We could check err.code === 'NETWORK_ERROR' for more granular handling, but any error can/should be handled.
        actions.app.setConnectionState(ConnectionState.NETWORK_ERROR)
      }

      const l1Network = _networks.data.isArbitrum
        ? _networks.data.partnerNetwork
        : _networks.data.network
      const l2Network = _networks.data.isArbitrum
        ? _networks.data.network
        : _networks.data.partnerNetwork

      setGlobalBridge(await Bridge.init(l1Signer, l2Signer))
      setTokenBridgeParams({
        walletAddress: l1Address,
        l1: { signer: l1Signer, network: l1Network },
        l2: { signer: l2Signer, network: l2Network }
      })
    },
    [_networks]
  )

  // Listen for account and network changes
  useEffect(() => {
    // Any time one of those changes
    setGlobalBridge(null)
    setTokenBridgeParams(null)

    switch (_networks.status) {
      case UseNetworksStatus.NOT_CONNECTED: {
        actions.app.setConnectionState(ConnectionState.NO_METAMASK)
        return
      }

      case UseNetworksStatus.NOT_SUPPORTED: {
        actions.app.setConnectionState(ConnectionState.WRONG_NETWORK)
        return
      }

      default: {
        const { network, isArbitrum } = _networks.data
        const networkId = String(network.chainID)

        // TODO: We're still relying on the old networks. We should switch to @arbitrum/sdk networks.
        actions.app.reset(networkId)
        actions.app.setNetworkID(networkId)

        if (!isArbitrum) {
          console.info('Deposit mode detected:')
          actions.app.setIsDepositMode(true)
          actions.app.setConnectionState(ConnectionState.L1_CONNECTED)
        } else {
          console.info('Withdrawal mode detected:')
          actions.app.setIsDepositMode(false)
          actions.app.setConnectionState(ConnectionState.L2_CONNECTED)
        }
      }
    }
  }, [_networks])

  // Listen for signers changes
  useEffect(() => {
    if (_signers.status !== UseSignersStatus.SUCCESS) {
      return
    }

    initBridge(_signers.data)
  }, [_signers, initBridge])

  useEffect(() => {
    axios
      .get(
        'https://raw.githubusercontent.com/OffchainLabs/arb-token-lists/master/src/WarningList/warningTokens.json'
      )
      .then(res => {
        actions.app.setWarningTokens(res.data)
      })
      .catch(err => {
        console.warn('Failed to fetch warning tokens:', err)
      })
  }, [])

  useEffect(() => {
    if (library) {
      const changeNetwork = async (chainId: string) => {
        const targetNetwork = networks[chainId]
        if (!targetNetwork) {
          throw new Error(`Cannot add unsupported network ${chainId}`)
        }
        const hexChainId = hexValue(BigNumber.from(chainId))
        const metamask = library?.provider

        if (metamask && metamask.isMetaMask) {
          console.log('Attempting to switch to chain', chainId)
          try {
            // @ts-ignore
            await metamask.request({
              method: 'wallet_switchEthereumChain',
              params: [
                {
                  chainId: hexChainId
                }
              ]
            })
          } catch (err: any) {
            if (err.code === 4902) {
              console.log(
                `Network ${chainId} not yet added to metamask; adding now:`
              )
              // @ts-ignore
              await metamask.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: hexChainId,
                    chainName: targetNetwork.name,
                    nativeCurrency: {
                      name: 'Ether',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: [targetNetwork.url],
                    blockExplorerUrls: [targetNetwork.explorerUrl]
                  }
                ]
              })
            } else {
              throw new Error(err)
            }
          }
        } else {
          // provider is not metamask, so no `wallet_switchEthereumChain` support
          console.log(
            'Not sure if current provider supports wallet_switchEthereumChain'
          )
          // TODO: show user a nice dialogue box instead of
          // eslint-disable-next-line no-alert
          const targetTxName = targetNetwork.isArbitrum ? 'withdraw' : 'deposit'
          alert(
            `Please connect to ${targetNetwork.name} to ${targetTxName}; make sure your wallet is connected to ${targetNetwork.name} when you are signing your ${targetTxName} transaction.`
          )

          // TODO: reset state so user can attempt to press "Deposit" again
        }
      }
      actions.app.setChangeNetwork(changeNetwork)
    }
  }, [library])

  return (
    <>
      {globalBridge && tokenBridgeParams && (
        <ArbTokenBridgeStoreSync
          bridge={globalBridge}
          tokenBridgeParams={tokenBridgeParams}
        />
      )}
      <BridgeContext.Provider value={globalBridge}>
        {children}
      </BridgeContext.Provider>
    </>
  )
}

function Routes() {
  const [prevTosAccepted] = useLocalStorage<string>(
    'arbitrum:bridge:tos' + (TOS_VERSION === 1 ? '' : `-v${TOS_VERSION - 1}`)
  )
  const [tosAccepted, setTosAccepted] = useLocalStorage<string>(
    'arbitrum:bridge:tos-v' + TOS_VERSION
  )

  const isTosAccepted = tosAccepted !== undefined
  const isPrevTosAccepted = prevTosAccepted !== undefined
  return (
    <Router>
      <DisclaimerModal
        setTosAccepted={setTosAccepted}
        tosAccepted={isTosAccepted}
        prevTosAccepted={isPrevTosAccepted}
      />
      <Switch>
        <Route path="/tos">
          <TermsOfService />
        </Route>
        {isTosAccepted && (
          <Route path="/">
            <AppContent />
          </Route>
        )}
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
