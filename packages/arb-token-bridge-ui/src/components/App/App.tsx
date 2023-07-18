import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useAccount, useNetwork, WagmiConfig } from 'wagmi'
import { darkTheme, RainbowKitProvider, Theme } from '@rainbow-me/rainbowkit'
import merge from 'lodash-es/merge'
import axios from 'axios'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { useLocalStorage } from 'react-use'
import { ConnectionState } from '../../util'
import { TokenBridgeParams } from '../../hooks/useArbTokenBridge'
import { Loader } from '../common/atoms/Loader'
import { WelcomeDialog } from './WelcomeDialog'
import { BlockedDialog } from './BlockedDialog'
import { AppContextProvider } from './AppContext'
import { config, useActions, useAppState } from '../../state'
import { Alert } from '../common/Alert'
import { MainContent } from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { PendingTransactionsUpdater } from '../syncers/PendingTransactionsUpdater'
import { RetryableTxnsIncluder } from '../syncers/RetryableTxnsIncluder'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { useDialog } from '../common/Dialog'
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
import { isNetwork, getSupportedNetworks, ChainId } from '../../util/networks'
import {
  ArbQueryParamProvider,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'
import { MainNetworkNotSupported } from '../common/MainNetworkNotSupported'
import { HeaderNetworkNotSupported } from '../common/HeaderNetworkNotSupported'
import { NetworkSelectionContainer } from '../common/NetworkSelectionContainer'
import { TOS_LOCALSTORAGE_KEY } from '../../constants'
import { AppConnectionFallbackContainer } from './AppConnectionFallbackContainer'
import FixingSpaceship from '@/images/arbinaut-fixing-spaceship.webp'
import { getProps } from '../../util/wagmi/setup'
import { useAccountIsBlocked } from '../../hooks/useAccountIsBlocked'
import { fetchCCTPDeposits } from '../../util/cctp/fetchCCTPDeposits'

declare global {
  interface Window {
    Cypress?: any
  }
}

const rainbowkitTheme = merge(darkTheme(), {
  colors: {
    accentColor: 'var(--blue-link)'
  },
  fonts: {
    body: "'Space Grotesk', sans-serif"
  }
} as Theme)

const AppContent = (): JSX.Element => {
  const { chain } = useNetwork()
  const {
    app: { connectionState }
  } = useAppState()

  const headerOverridesProps: HeaderOverridesProps = useMemo(() => {
    const { isTestnet, isGoerli } = isNetwork(chain?.id ?? 0)
    const className = isTestnet ? 'lg:bg-ocl-blue' : 'lg:bg-black'

    if (isGoerli) {
      return { imageSrc: 'images/HeaderArbitrumLogoGoerli.webp', className }
    }

    return { imageSrc: 'images/HeaderArbitrumLogoMainnet.svg', className }
  }, [chain])

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
        <NetworkSelectionContainer>
          <HeaderNetworkInformation />
        </NetworkSelectionContainer>

        <HeaderAccountPopover />
      </HeaderContent>

      <PendingTransactionsUpdater />
      <RetryableTxnsIncluder />

      <TokenListSyncer />
      <BalanceUpdater />
      <Notifications />
      <MainContent />
    </>
  )
}

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const actions = useActions()
  const { chain } = useNetwork()
  const { address, isConnected } = useAccount()
  const { isBlocked } = useAccountIsBlocked()

  const networksAndSigners = useNetworksAndSigners()

  const [tokenBridgeParams, setTokenBridgeParams] =
    useState<TokenBridgeParams | null>(null)

  const initBridge = useCallback(
    async (params: UseNetworksAndSignersConnectedResult) => {
      const { l1, l2 } = params

      if (!address) {
        return
      }

      setTokenBridgeParams({
        walletAddress: address,
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
    [address]
  )

  // Listen for account and network changes
  useEffect(() => {
    // Any time one of those changes
    setTokenBridgeParams(null)
    actions.app.setConnectionState(ConnectionState.LOADING)

    if (!isConnected || !chain) {
      return
    }

    const { l1, l2 } = networksAndSigners
    const isConnectedToArbitrum = isNetwork(chain.id).isArbitrum

    const l1NetworkChainId = l1.network.id
    const l2NetworkChainId = l2.network.id

    actions.app.reset(chain.id)
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
  }, [networksAndSigners, chain, isConnected, initBridge])

  useEffect(() => {
    axios
      .get(
        'https://raw.githubusercontent.com/OffchainLabs/arb-token-lists/aff40a59608678cfd9b034dd198011c90b65b8b6/src/WarningList/warningTokens.json'
      )
      .then(res => {
        actions.app.setWarningTokens(res.data)
      })
      .catch(err => {
        console.warn('Failed to fetch warning tokens:', err)
      })
  }, [])

  useEffect(() => {
    fetchCCTPDeposits({
      walletAddress: '0x054b7db5f5ddbc9748d3e7d8ded296fe37b1fd46',
      l1ChainId: ChainId.Mainnet
    })
  })

  if (address && isBlocked) {
    return (
      <BlockedDialog
        address={address}
        isOpen={true}
        // ignoring until we use the package
        // https://github.com/OffchainLabs/config-monorepo/pull/11
        //
        // eslint-disable-next-line
        onClose={() => {}}
      />
    )
  }

  return (
    <>
      {tokenBridgeParams && (
        <ArbTokenBridgeStoreSync tokenBridgeParams={tokenBridgeParams} />
      )}
      {children}
    </>
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

function ConnectionFallback(props: FallbackProps): JSX.Element {
  const { chain } = useNetwork()

  switch (props.status) {
    case UseNetworksAndSignersStatus.LOADING:
      return (
        <>
          <HeaderContent>
            <HeaderNetworkLoadingIndicator />
          </HeaderContent>

          <AppConnectionFallbackContainer>
            <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
              <Loader color="white" size="large" />
            </div>
          </AppConnectionFallbackContainer>
        </>
      )

    case UseNetworksAndSignersStatus.NOT_CONNECTED:
      return (
        <>
          <HeaderContent>
            <HeaderConnectWalletButton />
          </HeaderContent>

          <AppConnectionFallbackContainer>
            <span className="text-white">
              Please connect your wallet to use the bridge.
            </span>
          </AppConnectionFallbackContainer>
        </>
      )

    case UseNetworksAndSignersStatus.NOT_SUPPORTED:
      const supportedNetworks = getSupportedNetworks(chain?.id)

      return (
        <>
          <HeaderContent>
            <NetworkSelectionContainer>
              <HeaderNetworkNotSupported />
            </NetworkSelectionContainer>

            <HeaderAccountPopover isCorrectNetworkConnected={false} />
          </HeaderContent>

          <AppConnectionFallbackContainer
            layout="row"
            imgProps={{
              className: 'sm:w-[300px]',
              src: FixingSpaceship,
              alt: 'Arbinaut fixing a spaceship'
            }}
          >
            <MainNetworkNotSupported supportedNetworks={supportedNetworks} />
          </AppConnectionFallbackContainer>
        </>
      )
  }
}

// We're doing this as a workaround so users can select their preferred chain on WalletConnect.
//
// https://github.com/orgs/WalletConnect/discussions/2733
// https://github.com/wagmi-dev/references/blob/main/packages/connectors/src/walletConnect.ts#L114
const searchParams = new URLSearchParams(window.location.search)
const targetChainKey = searchParams.get('walletConnectChain')

const { wagmiConfigProps, rainbowKitProviderProps } = getProps(targetChainKey)

// Clear cache for everything related to WalletConnect v2.
//
// TODO: Remove this once the fix for the infinite loop / memory leak is identified.
Object.keys(localStorage).forEach(key => {
  if (key === 'wagmi.requestedChains' || key.startsWith('wc@2')) {
    localStorage.removeItem(key)
  }
})

export default function App() {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  const [tosAccepted, setTosAccepted] =
    useLocalStorage<string>(TOS_LOCALSTORAGE_KEY)
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
    <Provider value={overmind}>
      <ArbQueryParamProvider>
        <WagmiConfig {...wagmiConfigProps}>
          <RainbowKitProvider
            theme={rainbowkitTheme}
            {...rainbowKitProviderProps}
          >
            <WelcomeDialog {...welcomeDialogProps} onClose={onClose} />
            <NetworkReady>
              <AppContextProvider>
                <Injector>{isTosAccepted && <AppContent />}</Injector>
              </AppContextProvider>
            </NetworkReady>
          </RainbowKitProvider>
        </WagmiConfig>
      </ArbQueryParamProvider>
    </Provider>
  )
}
