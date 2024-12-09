import { useCallback, useEffect, useState } from 'react'

import { useAccount, useNetwork, WagmiConfig, useDisconnect } from 'wagmi'
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
import { useLocalStorage } from '@uidotdev/usehooks'

import { WelcomeDialog } from './WelcomeDialog'
import { BlockedDialog } from './BlockedDialog'
import { AppContextProvider } from './AppContext'
import { config, useActions, useAppState } from '../../state'
import { MainContent } from '../MainContent/MainContent'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { Header } from '../common/Header'
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
import { sanitizeQueryParams } from '../../hooks/useNetworks'
import { HeaderConnectWalletButton } from '../common/HeaderConnectWalletButton'
import { onDisconnectHandler } from '../../util/walletConnectUtils'
import { addressIsSmartContract } from '../../util/AddressUtils'
import { useSyncConnectedChainToAnalytics } from './useSyncConnectedChainToAnalytics'
import { useInterval } from 'react-use'
import { useArbTokenBridge } from '../../hooks/useArbTokenBridge'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'

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

function AppContent() {
  const { address, isConnected } = useAccount()
  const { isBlocked } = useAccountIsBlocked()
  const [tosAccepted] = useLocalStorage<boolean>(TOS_LOCALSTORAGE_KEY, false)
  const { openConnectModal } = useConnectModal()
  const actions = useActions()
  const {
    app: { selectedToken }
  } = useAppState()
  const {
    token: { updateTokenData }
  } = useArbTokenBridge()
  const { updateUSDCBalances } = useUpdateUSDCBalances({
    walletAddress: address
  })

  // We want to be sure this fetch is completed by the time we open the USDC modals
  useCCTPIsBlocked()

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
  }, [actions.app])

  useInterval(() => {
    updateUSDCBalances()
    if (selectedToken) {
      updateTokenData(selectedToken.address)
    }
  }, 10_000)

  useEffect(() => {
    if (tosAccepted && !isConnected) {
      openConnectModal?.()
    }
  }, [isConnected, tosAccepted, openConnectModal])

  useSyncConnectedChainToAnalytics()

  if (!tosAccepted) {
    return (
      <>
        <Header />
        <WelcomeDialog />
      </>
    )
  }

  if (!isConnected) {
    return (
      <>
        <Header>
          <HeaderConnectWalletButton />
        </Header>

        <div className="flex flex-col items-start gap-4 px-6 pb-8 pt-12 text-white">
          <p className="text-5xl">No wallet connected</p>
          <p className="text-xl">
            Please connect your wallet to use the bridge.
          </p>
        </div>
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
      <Header>
        <HeaderAccountPopover />
      </Header>
      <TokenListSyncer />
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

function ConnectedChainSyncer() {
  const { address } = useAccount()
  const [shouldSync, setShouldSync] = useState(false)
  const [didSync, setDidSync] = useState(false)
  const { disconnect } = useDisconnect({
    onSettled: onDisconnectHandler
  })

  const [{ sourceChain, destinationChain }, setQueryParams] =
    useArbQueryParams()
  const { chain } = useNetwork()

  const setSourceChainToConnectedChain = useCallback(() => {
    if (typeof chain === 'undefined') {
      return
    }

    const { sourceChainId: sourceChain, destinationChainId: destinationChain } =
      sanitizeQueryParams({
        sourceChainId: chain.id,
        destinationChainId: undefined
      })

    setQueryParams({ sourceChain, destinationChain })
  }, [chain, setQueryParams])

  useEffect(() => {
    async function checkCorrectChainForSmartContractWallet() {
      if (typeof chain === 'undefined') {
        return
      }
      if (!address) {
        return
      }
      const isSmartContractWallet = await addressIsSmartContract(
        address,
        chain.id
      )
      if (isSmartContractWallet && sourceChain !== chain.id) {
        const chainName = getNetworkName(chain.id)

        setSourceChainToConnectedChain()

        window.alert(
          `You're connected to the app with a smart contract wallet on ${chainName}. In order to properly enable transfers, the app will now reload.\n\nPlease reconnect after the reload.`
        )
        disconnect()
      }
    }

    checkCorrectChainForSmartContractWallet()
  }, [
    address,
    chain,
    disconnect,
    setQueryParams,
    setSourceChainToConnectedChain,
    sourceChain
  ])

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
      setSourceChainToConnectedChain()
      setDidSync(true)
    }
  }, [
    chain,
    shouldSync,
    didSync,
    setQueryParams,
    setSourceChainToConnectedChain
  ])

  return null
}

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
            <ConnectedChainSyncer />
            <AppContextProvider>
              <AppContent />
            </AppContextProvider>
          </RainbowKitProvider>
        </WagmiConfig>
      </ArbQueryParamProvider>
    </Provider>
  )
}
