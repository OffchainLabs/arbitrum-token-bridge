import React, { useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'

import { useAccount, useNetwork, WagmiConfig } from 'wagmi'
import {
  darkTheme,
  RainbowKitProvider,
  Theme,
  useConnectModal
} from '@rainbow-me/rainbowkit'
import merge from 'lodash-es/merge'
import axios from 'axios'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { useLocalStorage } from 'react-use'
import { ConnectionState } from '../../util'
import { TokenBridgeParams } from '../../hooks/useArbTokenBridge'
import { WelcomeDialog } from './WelcomeDialog'
import { BlockedDialog } from './BlockedDialog'
import { AppContextProvider } from './AppContext'
import { config, useActions, useAppState } from '../../state'
import { Alert } from '../common/Alert'
import { MainContent } from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { useDialog } from '../common/Dialog'
import {
  HeaderContent,
  HeaderOverrides,
  HeaderOverridesProps
} from '../common/Header'
import { HeaderAccountPopover } from '../common/HeaderAccountPopover'
import { Notifications } from '../common/Notifications'
import { isNetwork, rpcURLs } from '../../util/networks'
import {
  ArbQueryParamProvider,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'
import { GET_HELP_LINK, TOS_LOCALSTORAGE_KEY } from '../../constants'
import { getProps } from '../../util/wagmi/setup'
import { useAccountIsBlocked } from '../../hooks/useAccountIsBlocked'
import { useCCTPIsBlocked } from '../../hooks/CCTP/useCCTPIsBlocked'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { sanitizeQueryParams, useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { HeaderConnectWalletButton } from '../common/HeaderConnectWalletButton'
import { AppConnectionFallbackContainer } from './AppConnectionFallbackContainer'
import { ProviderName, trackEvent } from '../../util/AnalyticsUtils'

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
  const [{ sourceChain }] = useNetworks()
  const {
    app: { connectionState }
  } = useAppState()

  const headerOverridesProps: HeaderOverridesProps = useMemo(() => {
    if (isNetwork(sourceChain.id).isTestnet) {
      return {
        imageSrc: 'images/HeaderArbitrumLogoTestnet.webp',
        className: 'lg:bg-ocl-blue'
      }
    }

    return {
      imageSrc: 'images/HeaderArbitrumLogoMainnet.svg',
      className: 'lg:bg-black'
    }
  }, [sourceChain.id])

  if (connectionState === ConnectionState.NETWORK_ERROR) {
    return (
      <Alert type="red">
        Error: unable to connect to network. Try again soon and contact{' '}
        <a rel="noreferrer" target="_blank" href={GET_HELP_LINK}>
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
        <HeaderAccountPopover />
      </HeaderContent>

      <TokenListSyncer />
      <BalanceUpdater />
      <Notifications />
      <MainContent />
    </>
  )
}

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const actions = useActions()
  const { app } = useAppState()
  const { selectedToken } = app
  const { address, isConnected } = useAccount()
  const { isBlocked } = useAccountIsBlocked()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  // We want to be sure this fetch is completed by the time we open the USDC modals
  useCCTPIsBlocked()

  const [tokenBridgeParams, setTokenBridgeParams] =
    useState<TokenBridgeParams | null>(null)

  useEffect(() => {
    if (!nativeCurrency.isCustom) {
      return
    }

    const selectedTokenAddress = selectedToken?.address.toLowerCase()
    const selectedTokenL2Address = selectedToken?.l2Address?.toLowerCase()
    // This handles a super weird edge case where, for example:
    //
    // Your setup is: from Arbitrum One to Mainnet, and you have $ARB selected as the token you want to bridge over.
    // You then switch your destination network to a network that has $ARB as its native currency.
    // For this network, $ARB can only be bridged as the native currency, and not as a standard ERC-20, which is why we have to reset the selected token.
    if (
      selectedTokenAddress === nativeCurrency.address ||
      selectedTokenL2Address === nativeCurrency.address
    ) {
      actions.app.setSelectedToken(null)
    }
  }, [selectedToken, nativeCurrency])

  // Listen for account and network changes
  useEffect(() => {
    // Any time one of those changes
    setTokenBridgeParams(null)
    actions.app.setConnectionState(ConnectionState.LOADING)

    if (!isConnected) {
      return
    }

    const {
      isArbitrum: isConnectedToArbitrum,
      isOrbitChain: isConnectedToOrbitChain
    } = isNetwork(networks.sourceChain.id)
    const isParentChainEthereum = isNetwork(
      parentChain.id
    ).isEthereumMainnetOrTestnet

    actions.app.reset(networks.sourceChain.id)
    actions.app.setChainIds({
      l1NetworkChainId: parentChain.id,
      l2NetworkChainId: childChain.id
    })

    if (
      (isParentChainEthereum && isConnectedToArbitrum) ||
      isConnectedToOrbitChain
    ) {
      console.info('Withdrawal mode detected:')
      actions.app.setConnectionState(ConnectionState.L2_CONNECTED)
    } else {
      console.info('Deposit mode detected:')
      actions.app.setConnectionState(ConnectionState.L1_CONNECTED)
    }

    setTokenBridgeParams({
      l1: {
        network: parentChain,
        provider: parentChainProvider
      },
      l2: {
        network: childChain,
        provider: childChainProvider
      }
    })
  }, [
    isConnected,
    address,
    networks.sourceChain.id,
    parentChain.id,
    childChain.id,
    parentChain,
    childChain,
    parentChainProvider,
    childChainProvider
  ])

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

// connector names: https://github.com/wagmi-dev/wagmi/blob/b17c07443e407a695dfe9beced2148923b159315/docs/pages/core/connectors/_meta.en-US.json#L4
function getWalletName(connectorName: string): ProviderName {
  switch (connectorName) {
    case 'MetaMask':
    case 'Coinbase Wallet':
    case 'Trust Wallet':
    case 'Safe':
    case 'Injected':
    case 'Ledger':
      return connectorName

    case 'WalletConnectLegacy':
    case 'WalletConnect':
      return 'WalletConnect'

    default:
      return 'Other'
  }
}

/** given our RPC url, sanitize it before logging to Sentry, to only pass the url and not the keys */
function getBaseUrl(url: string) {
  try {
    const urlObject = new URL(url)
    return `${urlObject.protocol}//${urlObject.hostname}`
  } catch {
    // if invalid url passed
    return ''
  }
}

function NetworkReady({ children }: { children: React.ReactNode }) {
  const [networks] = useNetworks()
  const { parentChain, childChain } = useNetworksRelationship(networks)
  const { isConnected, connector } = useAccount()
  const [tosAccepted] = useLocalStorage<string>(TOS_LOCALSTORAGE_KEY)
  const { openConnectModal } = useConnectModal()

  useEffect(() => {
    if (tosAccepted !== undefined && !isConnected) {
      openConnectModal?.()
    }
  }, [isConnected, tosAccepted, openConnectModal])

  useEffect(() => {
    if (isConnected && connector) {
      const walletName = getWalletName(connector.name)
      trackEvent('Connect Wallet Click', { walletName })
    }

    // set a custom tag in sentry to filter issues by connected wallet.name
    Sentry.setTag('wallet.name', connector?.name ?? '')
  }, [isConnected, connector])

  useEffect(() => {
    Sentry.setTag('network.parent_chain_id', parentChain.id)
    Sentry.setTag(
      'network.parent_chain_rpc_url',
      getBaseUrl(rpcURLs[parentChain.id] ?? '')
    )
    Sentry.setTag('network.child_chain_id', childChain.id)
    Sentry.setTag(
      'network.child_chain_rpc_url',
      getBaseUrl(rpcURLs[childChain.id] ?? '')
    )
  }, [childChain.id, parentChain.id])

  if (!isConnected) {
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
  }

  return <>{children}</>
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

function ConnectedChainSyncer() {
  const [shouldSync, setShouldSync] = useState(false)
  const [didSync, setDidSync] = useState(false)

  const [{ sourceChain, destinationChain }, setQueryParams] =
    useArbQueryParams()
  const { chain } = useNetwork()

  useEffect(() => {
    if (shouldSync) {
      return
    }

    // Only sync connected chain to query params if the query params were not initially provided
    if (
      typeof sourceChain === 'undefined' &&
      typeof destinationChain === 'undefined'
    ) {
      setShouldSync(true)
    }
  }, [shouldSync, sourceChain, destinationChain])

  useEffect(() => {
    // When the chain is connected and we should sync, and we haven't synced yet, sync the connected chain to the query params
    if (chain && shouldSync && !didSync) {
      const {
        sourceChainId: sourceChain,
        destinationChainId: destinationChain
      } = sanitizeQueryParams({
        sourceChainId: chain.id,
        destinationChainId: undefined
      })

      setQueryParams({ sourceChain, destinationChain })
      setDidSync(true)
    }
  }, [chain, shouldSync, didSync, setQueryParams])

  return null
}

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
            <ConnectedChainSyncer />
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
