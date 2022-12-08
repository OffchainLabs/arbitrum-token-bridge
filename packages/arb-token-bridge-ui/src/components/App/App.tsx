import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useWallet } from '@arbitrum/use-wallet'
import axios from 'axios'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom'
import { useLocalStorage } from 'react-use'
import { ConnectionState, gnosisInterface, AccountType } from '../../util'
import { TokenBridgeParams } from 'token-bridge-sdk'
import { Contract } from 'ethers'
import Loader from 'react-loader-spinner'

import HeaderArbitrumLogoMainnet from '../../assets/HeaderArbitrumLogoMainnet.webp'
import HeaderArbitrumLogoRinkeby from '../../assets/HeaderArbitrumLogoRinkeby.webp'
import HeaderArbitrumLogoGoerli from '../../assets/HeaderArbitrumLogoGoerli.webp'

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
import { addressIsSmartContract } from '../../util/AddressUtils'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus,
  NetworksAndSignersProvider,
  UseNetworksAndSignersConnectedResult,
  FallbackProps
} from '../../hooks/useNetworksAndSigners'
import {
  HeaderContent,
  HeaderOverrides,
  HeaderOverridesProps
} from '../common/Header'
import { HeaderNetworkLoadingIndicator } from '../common/HeaderNetworkLoadingIndicator'
import { HeaderNetworkInformation } from '../common/HeaderNetworkInformation'
import { HeaderAccountPopover } from '../common/HeaderAccountPopover'
import { HeaderConnectWalletButton } from '../common/HeaderConnectWalletButton'
import { Notifications } from '../common/Notifications'
import { isNetwork, ChainId } from '../../util/networks'
import {
  ArbQueryParamProvider,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'
import { MainNetworkNotSupported } from '../common/MainNetworkNotSupported'
import { HeaderNetworkNotSupported } from '../common/HeaderNetworkNotSupported'
import { NetworkSelectionContainer } from '../common/NetworkSelectionContainer'
import { isTestingEnvironment } from '../../util/CommonUtils'

declare global {
  interface Window {
    Cypress?: any
  }
}

const AppContent = (): JSX.Element => {
  const { l1, chainId, accountType } = useNetworksAndSigners()
  const {
    app: { connectionState }
  } = useAppState()

  const headerOverridesProps: HeaderOverridesProps = useMemo(() => {
    const { isMainnet, isRinkeby, isGoerli } = isNetwork(l1.network.chainID)
    const className = isMainnet ? 'lg:bg-black' : 'lg:bg-blue-arbitrum'

    if (isRinkeby) {
      return { imageSrc: HeaderArbitrumLogoRinkeby, className }
    }

    if (isGoerli) {
      return { imageSrc: HeaderArbitrumLogoGoerli, className }
    }

    return { imageSrc: HeaderArbitrumLogoMainnet, className }
  }, [l1.network])

  if (connectionState === ConnectionState.SEQUENCER_UPDATE) {
    return (
      <Alert type="red">
        Note: The Arbitrum Sequencer Will be offline today 3pm-5pm EST for
        maintenance. Thanks for your patience!
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
      <HeaderOverrides {...headerOverridesProps} />

      <HeaderContent>
        <NetworkSelectionContainer
          supportedNetworks={
            isNetwork(chainId).isTestnet
              ? [ChainId.Goerli, ChainId.ArbitrumGoerli]
              : [ChainId.Mainnet, ChainId.ArbitrumOne, ChainId.ArbitrumNova]
          }
        >
          <HeaderNetworkInformation />
        </NetworkSelectionContainer>

        <HeaderAccountPopover />
      </HeaderContent>

      <PendingTransactionsUpdater />
      <RetryableTxnsIncluder />
      <TokenListSyncer />
      <BalanceUpdater />
      {!isTestingEnvironment && <PWLoadedUpdater />}

      <Notifications />
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

  const initBridge = useCallback(
    async (params: UseNetworksAndSignersConnectedResult) => {
      const { l1, l2 } = params
      const { signer: l1Signer } = l1

      const l1Address = await l1Signer.getAddress()

      setTokenBridgeParams({
        walletAddress: l1Address,
        l1: {
          network: l1.network,
          provider: l1.provider
        },
        l2: {
          network: l2.network,
          provider: l2.provider
        }
      })
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
      <ArbQueryParamProvider>
        <WelcomeDialog {...welcomeDialogProps} onClose={onClose} />
        <Switch>
          <Route path="/tos" exact>
            <TermsOfService />
          </Route>

          <Route path="/" exact>
            <NetworkReady>
              <AppContextProvider>
                <Injector>{isTosAccepted && <AppContent />}</Injector>
              </AppContextProvider>
            </NetworkReady>
          </Route>

          <Route path="*">
            <div className="flex w-full flex-col items-center space-y-4 px-8 py-4 text-center lg:py-0">
              <span className="text-8xl text-white">404</span>
              <p className="text-3xl text-white">
                Page not found in this solar system
              </p>
              <img
                src="/images/arbinaut-fixing-spaceship.webp"
                alt="Arbinaut fixing a spaceship"
                className="lg:max-w-md"
              />
            </div>
          </Route>
        </Switch>
      </ArbQueryParamProvider>
    </Router>
  )
}

function NetworkReady({ children }: { children: React.ReactNode }) {
  const [{ l2ChainId }] = useArbQueryParams()

  return (
    <NetworksAndSignersProvider
      selectedL2ChainId={l2ChainId || undefined}
      fallback={fallbackProps => <ConnectionFallback {...fallbackProps} />}
    >
      {children}
    </NetworksAndSignersProvider>
  )
}

function ConnectionFallbackContainer({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mt-6 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-8">
      {children}
      <ExternalLink href="https://metamask.io/download">
        <img
          className="sm:w-[420px]"
          src="/images/three-arbinauts.webp"
          alt="Three Arbinauts"
        />
      </ExternalLink>
    </div>
  )
}

function ConnectionFallback(props: FallbackProps): JSX.Element {
  const { connect } = useWallet()

  async function showConnectionModal() {
    try {
      await connect(modalProviderOpts)
    } catch (error) {
      // Dialog was closed by user
    }
  }

  switch (props.status) {
    case UseNetworksAndSignersStatus.LOADING:
      return (
        <>
          <HeaderContent>
            <HeaderNetworkLoadingIndicator />
          </HeaderContent>

          <ConnectionFallbackContainer>
            <div className="absolute mt-20 sm:mt-24">
              <Loader type="TailSpin" color="white" height={44} width={44} />
            </div>
          </ConnectionFallbackContainer>
        </>
      )

    case UseNetworksAndSignersStatus.NOT_CONNECTED:
      return (
        <>
          <HeaderContent>
            <HeaderConnectWalletButton />
          </HeaderContent>

          <ConnectionFallbackContainer>
            <Button variant="primary" onClick={showConnectionModal}>
              Connect Wallet
            </Button>
          </ConnectionFallbackContainer>
        </>
      )

    case UseNetworksAndSignersStatus.NOT_SUPPORTED:
      const supportedNetworks = isNetwork(props.chainId).isTestnet
        ? [ChainId.Goerli, ChainId.ArbitrumGoerli]
        : [ChainId.Mainnet, ChainId.ArbitrumOne, ChainId.ArbitrumNova]

      return (
        <>
          <HeaderContent>
            <NetworkSelectionContainer supportedNetworks={supportedNetworks}>
              <HeaderNetworkNotSupported />
            </NetworkSelectionContainer>
          </HeaderContent>

          <ConnectionFallbackContainer>
            <MainNetworkNotSupported supportedNetworks={supportedNetworks} />
          </ConnectionFallbackContainer>
        </>
      )
  }
}

export default function App() {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  return (
    <Provider value={overmind}>
      <Layout>
        <Routes />
      </Layout>
    </Provider>
  )
}
