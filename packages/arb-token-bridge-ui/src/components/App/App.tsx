import React, { useCallback, useEffect, useState } from 'react'

import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { useWallet } from '@arbitrum/use-wallet'
import axios from 'axios'
import { BigNumber } from 'ethers'
import { hexValue } from 'ethers/lib/utils'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom'
import { useLocalStorage } from 'react-use'
import { ConnectionState } from 'src/util/index'
import { TokenBridgeParams } from 'token-bridge-sdk'
import { L1Network, L2Network } from '@arbitrum/sdk'
import { ExternalProvider } from '@ethersproject/providers'
import Loader from 'react-loader-spinner'

import { WelcomeDialog } from './WelcomeDialog'
import { AppContextProvider, useAppContextState } from './AppContext'
import { config, useActions, useAppState } from '../../state'
import { modalProviderOpts } from '../../util/modelProviderOpts'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Layout } from '../common/Layout'
import { MainContent } from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { PendingTransactionsUpdater } from '../syncers/PendingTransactionsUpdater'
import { PWLoadedUpdater } from '../syncers/PWLoadedUpdater'
import { RetryableTxnsIncluder } from '../syncers/RetryableTxnsIncluder'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { TermsOfService, TOS_VERSION } from '../TermsOfService/TermsOfService'
import { ExternalLink } from '../common/ExternalLink'
import { useDialog } from '../common/Dialog'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus,
  NetworksAndSignersProvider
} from '../../hooks/useNetworksAndSigners'

type Web3Provider = ExternalProvider & {
  isMetaMask?: boolean
  isImToken?: boolean
}
const isSwitchChainSupported = (provider: Web3Provider) =>
  provider && (provider.isMetaMask || provider.isImToken)

const NoMetamaskIndicator = (): JSX.Element => {
  const { connect } = useWallet()

  function showConnectionModal() {
    connect(modalProviderOpts)
  }

  return (
    <div className="container mx-auto px-4">
      <div className="mb-4 flex justify-center">
        <Alert type="blue">Ethereum provider not detected, please login.</Alert>
      </div>

      <div className="mb-4 flex justify-center">
        <a
          href="https://metamask.io/download.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className="w-96"
            src="/images/impact_transparent.png"
            alt="Wallet"
          />
        </a>
      </div>
      <div className="flex justify-center">
        <Button variant="primary" onClick={showConnectionModal}>
          Connect Wallet
        </Button>
      </div>
    </div>
  )
}

function NetworkLoading() {
  return (
    <div className="absolute top-0 left-0 flex h-screen w-full items-center justify-center">
      <div className="opacity-100">
        <Loader type="TailSpin" color="white" height={64} width={64} />
      </div>
    </div>
  )
}

async function addressIsEOA(_address: string, _signer: JsonRpcSigner) {
  return (await _signer.provider.getCode(_address)).length <= 2
}

const AppContent = (): JSX.Element => {
  const {
    app: { connectionState }
  } = useAppState()

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
      <PendingTransactionsUpdater />
      <RetryableTxnsIncluder />
      <TokenListSyncer />
      <BalanceUpdater />
      <PWLoadedUpdater />
      <MainContent />
    </>
  )
}

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const actions = useActions()

  const networksAndSigners = useNetworksAndSigners()
  const { currentL1BlockNumber } = useAppContextState()

  const [tokenBridgeParams, setTokenBridgeParams] =
    useState<TokenBridgeParams | null>(null)

  const { provider: library } = useWallet()

  const initBridge = useCallback(
    async (params: {
      l1: {
        signer: JsonRpcSigner
        network: L1Network
      }
      l2: {
        signer: JsonRpcSigner
        network: L2Network
      }
    }) => {
      const {
        l1: { signer: l1Signer },
        l2: { signer: l2Signer }
      } = params

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

      setTokenBridgeParams({ walletAddress: l1Address, ...params })
    },
    []
  )

  useEffect(() => {
    if (currentL1BlockNumber > 0) {
      console.log('Current block number on L1:', currentL1BlockNumber)
    }
  }, [currentL1BlockNumber])

  // Listen for account and network changes
  useEffect(() => {
    // Any time one of those changes
    setTokenBridgeParams(null)
    actions.app.setConnectionState(ConnectionState.LOADING)
    if (networksAndSigners.status !== UseNetworksAndSignersStatus.CONNECTED) {
      return
    }

    const { l1, l2, isConnectedToArbitrum } = networksAndSigners
    const network = isConnectedToArbitrum ? l2.network : l1.network

    const l1NetworkChainId = l1.network.chainID
    const l2NetworkChainId = l2.network.chainID

    actions.app.reset(network.chainID)
    actions.app.setChainIds({ l1NetworkChainId, l2NetworkChainId })

    if (!isConnectedToArbitrum) {
      console.info('Deposit mode detected:')
      actions.app.setIsDepositMode(true)
      actions.app.setConnectionState(ConnectionState.L1_CONNECTED)
    } else {
      console.info('Withdrawal mode detected:')
      actions.app.setIsDepositMode(false)
      actions.app.setConnectionState(ConnectionState.L2_CONNECTED)
    }

    initBridge(networksAndSigners)
  }, [networksAndSigners, initBridge])

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
      async function logGasPrice() {
        console.log('Gas price:', await library?.getGasPrice())
      }

      const changeNetwork = async (network: L1Network | L2Network) => {
        const chainId = network.chainID
        const hexChainId = hexValue(BigNumber.from(chainId))
        const provider = library?.provider

        if (isSwitchChainSupported(provider)) {
          console.log('Attempting to switch to chain', chainId)
          try {
            // @ts-ignore
            await provider.request({
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
                `Network ${chainId} not yet added to wallet; adding now:`
              )
              // @ts-ignore
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: hexChainId,
                    chainName: network.name,
                    nativeCurrency: {
                      name: 'Ether',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: [network.rpcURL],
                    blockExplorerUrls: [network.explorerUrl]
                  }
                ]
              })
            } else {
              throw new Error(err)
            }
          }
        } else {
          // if no `wallet_switchEthereumChain` support
          console.log(
            'Not sure if current provider supports wallet_switchEthereumChain'
          )
          // TODO: show user a nice dialogue box instead of
          // eslint-disable-next-line no-alert
          const targetTxName = networksAndSigners.isConnectedToArbitrum
            ? 'deposit'
            : 'withdraw'

          alert(
            `Please connect to ${network.name} to ${targetTxName}; make sure your wallet is connected to ${network.name} when you are signing your ${targetTxName} transaction.`
          )

          // TODO: reset state so user can attempt to press "Deposit" again
        }
      }

      logGasPrice()
      actions.app.setChangeNetwork(changeNetwork)
    }
  }, [library, networksAndSigners.isConnectedToArbitrum])

  return (
    <>
      {tokenBridgeParams && (
        <ArbTokenBridgeStoreSync tokenBridgeParams={tokenBridgeParams} />
      )}
      {children}
    </>
  )
}

function Routes() {
  const key = 'arbitrum:bridge:tos-v' + TOS_VERSION
  const [tosAccepted, setTosAccepted] = useLocalStorage<string>(key)
  const [welcomeDialogProps, openWelcomeDialog] = useDialog()

  const isTosAccepted = tosAccepted !== undefined

  useEffect(() => {
    if (!isTosAccepted) {
      openWelcomeDialog()
    }
  }, [isTosAccepted, openWelcomeDialog])

  function onClose(confirmed: boolean) {
    // Only close after confirming (agreeing to terms)
    if (confirmed) {
      setTosAccepted('true')
      welcomeDialogProps.onClose(confirmed)
    }
  }

  return (
    <Router>
      <WelcomeDialog {...welcomeDialogProps} onClose={onClose} />
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

function ConnectionFallback({
  status
}: {
  status:
    | UseNetworksAndSignersStatus.LOADING
    | UseNetworksAndSignersStatus.NOT_SUPPORTED
    | UseNetworksAndSignersStatus.NOT_CONNECTED
}): JSX.Element {
  switch (status) {
    case UseNetworksAndSignersStatus.NOT_CONNECTED:
      return <NoMetamaskIndicator />

    case UseNetworksAndSignersStatus.NOT_SUPPORTED:
      return (
        <div className="flex w-full justify-center">
          <span className="py-24 text-2xl font-light text-blue-link text-white">
            You are on the wrong network.{' '}
            <ExternalLink
              href="https://arbitrum.io/bridge-tutorial"
              className="arb-hover underline"
            >
              Read our tutorial
            </ExternalLink>{' '}
            on how to switch networks.
          </span>
        </div>
      )

    default:
      return <NetworkLoading />
  }
}

const App = (): JSX.Element => {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  return (
    <Provider value={overmind}>
      <NetworksAndSignersProvider
        fallback={status => (
          <Layout>
            <ConnectionFallback status={status} />
          </Layout>
        )}
      >
        <AppContextProvider>
          <Layout>
            <Injector>
              <Routes />
            </Injector>
          </Layout>
        </AppContextProvider>
      </NetworksAndSignersProvider>
    </Provider>
  )
}

export default App
