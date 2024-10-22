import { useEffect, useState } from 'react'
import { useAccount, WagmiConfig } from 'wagmi'
import { darkTheme, RainbowKitProvider, Theme } from '@rainbow-me/rainbowkit'
import { useCallback, useEffect, useState } from 'react'

import merge from 'lodash-es/merge'
import axios from 'axios'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { useLocalStorage } from '@uidotdev/usehooks'

import { ConnectionState } from '../../util'
import { TokenBridgeParams } from '../../hooks/useArbTokenBridge'
import { WelcomeDialog } from './WelcomeDialog'
import { BlockedDialog } from './BlockedDialog'
import { AppContextProvider } from './AppContext'
import { config, useActions, useAppState } from '../../state'
import { MainContent } from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { Header } from '../common/Header'
import { ArbQueryParamProvider } from '../../hooks/useArbQueryParams'
import { isNetwork } from '../../util/networks'
import { HeaderAccountPopover } from '../common/HeaderAccountPopover'
import { getNetworkName } from '../../util/networks'
import {
  ArbQueryParamProvider,
  useArbQueryParams
} from '../../hooks/useArbQueryParams'
import { TOS_LOCALSTORAGE_KEY } from '../../constants'
import { getProps } from '../../util/wagmi/setup'
import { useAccountIsBlocked } from '../../hooks/useAccountIsBlocked'
import { useCCTPIsBlocked } from '../../hooks/CCTP/useCCTPIsBlocked'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useSyncConnectedChainToAnalytics } from './useSyncConnectedChainToAnalytics'
import { useSyncConnectedChainToQueryParams } from './useSyncConnectedChainToQueryParams'
import { HeaderConnectWalletButton } from '../common/HeaderConnectWalletButton'
import { onDisconnectHandler } from '../../util/walletConnectUtils'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { isDepositMode } from '../../util/isDepositMode'

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
    body: 'Roboto, sans-serif'
  }
} as Theme)

const ArbTokenBridgeStoreSyncWrapper = (): JSX.Element | null => {
  const actions = useActions()
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  // We want to be sure this fetch is completed by the time we open the USDC modals
  useCCTPIsBlocked()

  useSyncConnectedChainToAnalytics()
  useSyncConnectedChainToQueryParams()

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
    actions.app.reset(networks.sourceChain.id)
    actions.app.setChainIds({
      l1NetworkChainId: parentChain.id,
      l2NetworkChainId: childChain.id
    })

    if (
      isDepositMode({
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id
      })
    ) {
      console.info('Deposit mode detected:')
      actions.app.setConnectionState(ConnectionState.L1_CONNECTED)
    } else {
      console.info('Withdrawal mode detected:')
      actions.app.setConnectionState(ConnectionState.L2_CONNECTED)
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

  if (!tokenBridgeParams) {
    return null
  }

  return <ArbTokenBridgeStoreSync tokenBridgeParams={tokenBridgeParams} />
}

function AppContent() {
  const { address } = useAccount()
  const { isBlocked } = useAccountIsBlocked()
  const [tosAccepted] = useLocalStorage<boolean>(TOS_LOCALSTORAGE_KEY, false)

  useSyncConnectedChainToAnalytics()

  if (!tosAccepted) {
    return (
      <>
        <Header />
        <WelcomeDialog />
      </>
    )
  }

  if (address && isBlocked) {
    return (
      <BlockedDialog
        address={address}
        isOpen={true}
        closeable={false}
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
      <Header />
      <TokenListSyncer />
      <BalanceUpdater />
      <ArbTokenBridgeStoreSyncWrapper />
      <MainContent />
    </>
  )
}

// We're doing this as a workaround so users can select their preferred chain on WalletConnect.
//
// https://github.com/orgs/WalletConnect/discussions/2733
// https://github.com/wagmi-dev/references/blob/main/packages/connectors/src/walletConnect.ts#L114
const searchParams = new URLSearchParams(window.location.search)
const targetChainKey = searchParams.get('sourceChain')

const { wagmiConfigProps, rainbowKitProviderProps } = getProps(targetChainKey)

// Clear cache for everything related to WalletConnect v2.
//
// TODO: Remove this once the fix for the infinite loop / memory leak is identified.
Object.keys(localStorage).forEach(key => {
  if (
    key === 'wagmi.requestedChains' ||
    key === 'wagmi.store' ||
    key.startsWith('wc@2')
  ) {
    localStorage.removeItem(key)
  }
})

export default function App() {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  return (
    <Provider value={overmind}>
      <ArbQueryParamProvider>
        <WagmiConfig {...wagmiConfigProps}>
          <RainbowKitProvider
            theme={rainbowkitTheme}
            {...rainbowKitProviderProps}
          >
            <AppContextProvider>
              <AppContent />
            </AppContextProvider>
          </RainbowKitProvider>
        </WagmiConfig>
      </ArbQueryParamProvider>
    </Provider>
  )
}
