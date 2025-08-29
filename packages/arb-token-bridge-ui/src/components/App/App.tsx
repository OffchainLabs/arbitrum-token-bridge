import React, { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

import axios from 'axios'
import { TokenBridgeParams } from '../../hooks/useArbTokenBridge'
import { BlockedDialog } from './BlockedDialog'

import { useActions } from '../../state'
import { MainContent } from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { Header, HeaderAccountOrConnectWalletButton } from '../common/Header'
import { useAccountIsBlocked } from '../../hooks/useAccountIsBlocked'
import { useCCTPIsBlocked } from '../../hooks/CCTP/useCCTPIsBlocked'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useSyncConnectedChainToAnalytics } from './useSyncConnectedChainToAnalytics'
import { useSyncConnectedChainToQueryParams } from './useSyncConnectedChainToQueryParams'
import { Layout } from '../common/Layout'
import { useTheme } from '../../hooks/useTheme'
import dynamic from 'next/dynamic'
import { Loader } from '../common/atoms/Loader'

declare global {
  interface Window {
    Cypress?: any
  }
}

const ArbTokenBridgeStoreSyncWrapper = (): JSX.Element | null => {
  const actions = useActions()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)

  // We want to be sure this fetch is completed by the time we open the USDC modals
  useCCTPIsBlocked()

  useSyncConnectedChainToAnalytics()
  useSyncConnectedChainToQueryParams()

  const [tokenBridgeParams, setTokenBridgeParams] =
    useState<TokenBridgeParams | null>(null)

  // Listen for account and network changes
  useEffect(() => {
    // Any time one of those changes
    setTokenBridgeParams(null)

    actions.app.reset()
    actions.app.setChainIds({
      l1NetworkChainId: parentChain.id,
      l2NetworkChainId: childChain.id
    })

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

const AppContent = React.memo(() => {
  const { address } = useAccount()
  const { isBlocked } = useAccountIsBlocked()

  // apply custom themes if any
  useTheme()

  if (address && isBlocked) {
    return (
      <BlockedDialog
        address={address}
        isOpen={true}
        closeable={false}
        // ignoring until we use the package
        // https://github.com/OffchainLabs/config-monorepo/pull/11
        //

        onClose={() => {}}
      />
    )
  }

  return (
    <>
      <Header>
        <HeaderAccountOrConnectWalletButton />
      </Header>
      <TokenListSyncer />
      <ArbTokenBridgeStoreSyncWrapper />
      <MainContent />
    </>
  )
})

AppContent.displayName = 'AppContent'

const AppProviders = dynamic(
  () => import('./AppProviders').then(mod => mod.AppProviders),
  {
    ssr: false, // use-query-params provider doesn't support SSR
    loading: () => (
      <div className="bg-black-500 flex h-screen w-screen items-center justify-center">
        <div className="h-12 w-full lg:h-16" />
        <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
          <Loader size="large" color="white" />
        </div>
      </div>
    )
  }
)

export default function App() {
  return (
    <AppProviders>
      <Layout>
        <AppContent />
      </Layout>
    </AppProviders>
  )
}
