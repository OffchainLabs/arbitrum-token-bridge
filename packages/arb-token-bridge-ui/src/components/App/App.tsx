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

import { config, useActions, useAppState } from '../../state'
import { modalProviderOpts } from '../../util/modelProviderOpts'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Layout } from '../common/Layout'
import MessageOverlay from '../common/MessageOverlay'
import { DisclaimerModal } from '../DisclaimerModal/DisclaimerModal'
import MainContent from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { PendingTransactionsUpdater } from '../syncers/PendingTransactionsUpdater'
import { PWLoadedUpdater } from '../syncers/PWLoadedUpdater'
import { RetryableTxnsIncluder } from '../syncers/RetryableTxnsIncluder'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { TermsOfService, TOS_VERSION } from '../TermsOfService/TermsOfService'

import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'
import { useBlockNumber } from '../../hooks/useBlockNumber'

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
      <MessageOverlay />
      <MainContent />
    </>
  )
}

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const actions = useActions()

  const networksAndSigners = useNetworksAndSigners()
  const currentL1BlockNumber = useBlockNumber(
    networksAndSigners.l1.signer?.provider
  )

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
          // provider is not metamask, so no `wallet_switchEthereumChain` support
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

function NetworkReady({ children }: { children: JSX.Element }): JSX.Element {
  const { status } = useNetworksAndSigners()

  if (status === UseNetworksAndSignersStatus.NOT_CONNECTED) {
    return <NoMetamaskIndicator />
  }

  if (status === UseNetworksAndSignersStatus.NOT_SUPPORTED) {
    return (
      <div>
        <div className="mb-4">
          You are on the wrong network. Read our tutorial below on how to switch
          networks.
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

  return children
}

const App = (): JSX.Element => {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  return (
    <Provider value={overmind}>
      <Layout>
        <NetworkReady>
          <Injector>
            <Routes />
          </Injector>
        </NetworkReady>
      </Layout>
    </Provider>
  )
}

export default App
