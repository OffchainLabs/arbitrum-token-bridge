import { useLocalStorage } from '@uidotdev/usehooks'
import axios from 'axios'
import { useEffect, useState } from 'react'
import React from 'react'
import { useAccount } from 'wagmi'

import { TOS_LOCALSTORAGE_KEY } from '../../constants'
import { useCCTPIsBlocked } from '../../hooks/CCTP/useCCTPIsBlocked'
import { useAccountIsBlocked } from '../../hooks/useAccountIsBlocked'
import { TokenBridgeParams } from '../../hooks/useArbTokenBridge'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useActions } from '../../state'
import { Header, HeaderAccountOrConnectWalletButton } from '../common/Header'
import { Layout } from '../common/Layout'
import { MainContent } from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { AppProviders } from './AppProviders'
import { BlockedDialog } from './BlockedDialog'
import { useSyncConnectedChainToAnalytics } from './useSyncConnectedChainToAnalytics'
import { useSyncConnectedChainToQueryParams } from './useSyncConnectedChainToQueryParams'
import { WelcomeDialog } from './WelcomeDialog'

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
  const [tosAccepted] = useLocalStorage<boolean>(TOS_LOCALSTORAGE_KEY, false)

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

export default function App() {
  return (
    <AppProviders>
      <Layout>
        <AppContent />
      </Layout>
    </AppProviders>
  )
}
