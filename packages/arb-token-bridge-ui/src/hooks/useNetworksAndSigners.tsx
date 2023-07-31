/*

Hooks and utility functions written to maintain L1 and L2 connnection state (using context) and their metadata across the Bridge UI.
These can be used to answer and access the following use-cases across the app -

1. Is the network connected? If yes, is it Arbitrum (L2) or Ethereum (L1)?
2. Signer exposed by the wallet to sign and execute RPC transactions
3. Provider exposed by the wallet to query the blockchain

*/

import React, {
  useCallback,
  useEffect,
  useState,
  useContext,
  createContext
} from 'react'
import {
  JsonRpcProvider,
  StaticJsonRpcProvider,
  Web3Provider
} from '@ethersproject/providers'
import { getL1Network, getL2Network } from '@arbitrum/sdk'
import { Chain, useAccount, useNetwork, useProvider } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useLocalStorage } from 'react-use'

import { chainIdToDefaultL2ChainId, isNetwork, rpcURLs } from '../util/networks'
import { getWagmiChain } from '../util/wagmi/getWagmiChain'
import { useArbQueryParams } from './useArbQueryParams'
import { trackEvent } from '../util/AnalyticsUtils'

import { TOS_LOCALSTORAGE_KEY } from '../constants'
import { useIsConnectedToArbitrum } from './useIsConnectedToArbitrum'

export enum UseNetworksAndSignersStatus {
  LOADING = 'loading',
  NOT_CONNECTED = 'not_connected',
  NOT_SUPPORTED = 'not_supported',
  CONNECTED = 'connected'
}

export type UseNetworksAndSignersLoadingOrErrorStatus =
  | UseNetworksAndSignersStatus.LOADING
  | UseNetworksAndSignersStatus.NOT_CONNECTED

export type UseNetworksAndSignersNotSupportedStatus =
  UseNetworksAndSignersStatus.NOT_SUPPORTED

const defaultStatus =
  typeof window.ethereum === 'undefined'
    ? UseNetworksAndSignersStatus.NOT_CONNECTED
    : UseNetworksAndSignersStatus.LOADING

export type UseNetworksAndSignersLoadingOrErrorResult = {
  status: UseNetworksAndSignersLoadingOrErrorStatus
}

export type UseNetworksAndSignersNotSupportedResult = {
  status: UseNetworksAndSignersStatus.NOT_SUPPORTED
  chainId: number // the current unsupported chainId which is connected to UI
}

export type UseNetworksAndSignersConnectedResult = {
  status: UseNetworksAndSignersStatus.CONNECTED
  l1: {
    network: Chain
    provider: JsonRpcProvider
  }
  l2: {
    network: Chain
    provider: JsonRpcProvider
  }
}

export type UseNetworksAndSignersResult =
  | UseNetworksAndSignersLoadingOrErrorResult
  | UseNetworksAndSignersConnectedResult
  | UseNetworksAndSignersNotSupportedResult

export const NetworksAndSignersContext = createContext<
  UseNetworksAndSignersConnectedResult | undefined
>(undefined)

export function useNetworksAndSigners() {
  const context = useContext(NetworksAndSignersContext)

  if (typeof context === 'undefined') {
    throw new Error(
      'The useNetworksAndSigners Hook must only be used inside NetworksAndSignersContext.Provider.'
    )
  }

  return context
}

export type FallbackProps =
  | { status: UseNetworksAndSignersLoadingOrErrorStatus }
  | { status: UseNetworksAndSignersNotSupportedStatus }

export type NetworksAndSignersProviderProps = {
  /**
   * Chooses a specific L2 chain in a situation where multiple L2 chains are connected to a single L1 chain.
   */
  selectedL2ChainId?: number
  /**
   * Render prop that gets called with the current status in case of anything other than a successful connection.
   *
   * @see https://reactjs.org/docs/render-props.html
   */
  fallback: (props: FallbackProps) => JSX.Element
  /**
   * Renders on successful connection.
   */
  children: React.ReactNode
}

// TODO: maintain these wallet names in a central constants file (like networks.ts/wallet.ts) - can be consistently accessed all throughout the app?
export type ProviderName =
  | 'MetaMask'
  | 'Coinbase Wallet'
  | 'Trust Wallet'
  | 'WalletConnect'
  | 'Safe' // not used yet
  | 'Injected'
  | 'Ledger'
  | 'Other'

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

export function NetworksAndSignersProvider(
  props: NetworksAndSignersProviderProps
): JSX.Element {
  const { selectedL2ChainId } = props
  const { address, connector, isDisconnected, isConnected } = useAccount()
  const { chain } = useNetwork()
  const provider = useProvider()
  const { openConnectModal } = useConnectModal()
  const [result, setResult] = useState<UseNetworksAndSignersResult>({
    status: defaultStatus
  })
  const [tosAccepted] = useLocalStorage<string>(TOS_LOCALSTORAGE_KEY)
  const isConnectedToArbitrum = useIsConnectedToArbitrum()

  const isTosAccepted = tosAccepted !== undefined

  const [, setQueryParams] = useArbQueryParams()

  // Reset back to the not connected state in case the user manually disconnects through their wallet
  useEffect(() => {
    if (isDisconnected || !isConnected) {
      setResult({ status: UseNetworksAndSignersStatus.NOT_CONNECTED })
    }
    if (isConnected && connector) {
      const walletName = getWalletName(connector.name)
      trackEvent('Connect Wallet Click', { walletName })
    }
  }, [isDisconnected, isConnected, connector])

  useEffect(() => {
    if (isTosAccepted) {
      openConnectModal?.()
    }
  }, [isTosAccepted, openConnectModal])

  // TODO: Don't run all of this when an account switch happens. Just derive signers from networks?
  const update = useCallback(async () => {
    if (!address || !chain) {
      return
    }

    const providerChainId = chain.id
    const chainNotSupported = !(providerChainId in chainIdToDefaultL2ChainId)

    if (chainNotSupported) {
      console.error(`Chain ${providerChainId} not supported`)
      setResult({
        status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
        chainId: providerChainId
      })
      return
    }

    console.log({ selectedL2ChainId })

    /***
     * Case 1: selectedChainId is undefined =>
     *    A. if connected to Arbitrum, keep as undefined for special case that sets L1 to Ethereum
     *    B. else, set it to provider's default L2
     * Case 2: selectedChainId is defined but not supported by provider => reset query params -> case 1
     * Case 3: selectedChainId is defined and supported, continue
     */
    let _selectedL2ChainId = selectedL2ChainId
    const providerSupportedL2 = chainIdToDefaultL2ChainId[providerChainId]!

    // Case 1: allow undefined for the Arbitrum connection, or use a default L2 based on the connected provider chainid
    _selectedL2ChainId = _selectedL2ChainId || providerSupportedL2[0]
    if (typeof _selectedL2ChainId === 'undefined') {
      console.error(`Unknown provider chainId: ${providerChainId}`)
      setResult({
        status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
        chainId: providerChainId
      })
      return
    }

    const isSelectedL2ChainIdArbitrum = isNetwork(selectedL2ChainId!).isArbitrum

    // Case 2: L2 is not supported by provider
    if (
      !providerSupportedL2.includes(_selectedL2ChainId) &&
      !isSelectedL2ChainIdArbitrum
    ) {
      // remove the l2chainId, keeping the rest of the params intact
      setQueryParams({
        l2ChainId: undefined
      })

      return
    }

    // Case 3
    getL1Network(provider as Web3Provider)
      .then(async l1Network => {
        const isL1Arbitrum = isNetwork(l1Network.chainID).isArbitrum

        // // There's no preffered L2 set, but we are connected to Arbitrum.
        // if (isL1Arbitrum && !selectedL2ChainId) {
        //   // We want Arbitrum to be paired with Ethereum instead of L3 in our UI.
        //   // However the current flow would set it to Arbitrum's partner L3.

        //   // We know L1 is Arbitrum, we will set it to L2 instead.
        //   _selectedL2ChainId = l1Network.chainID
        //   // Jump to 'getL2Network'
        //   throw new Error()
        // }

        // Web3Provider is connected to an L1 network. We instantiate a provider for the L2 network.
        const l2Provider = new StaticJsonRpcProvider(
          rpcURLs[_selectedL2ChainId!] // _selectedL2ChainId is defined here because of L185
        )
        const l2Network = await getL2Network(l2Provider)

        if (isL1Arbitrum) {
          if (isSelectedL2ChainIdArbitrum) {
            // Special case for L1 <> L3 switching in 'to' network.
            // This happens when Arbitrum is the preffered L2 chain (in query params), but L1 is also Arbitrum.
            l1Network = await getL1Network(l2Network.partnerChainID)
          }
        }

        // from the L1 network, instantiate the provider for that too
        // - done to feed into a consistent l1-l2 network-signer result state both having signer+providers
        const l1Provider = new StaticJsonRpcProvider(rpcURLs[l1Network.chainID])

        console.log('Setting 1.')

        setResult({
          status: UseNetworksAndSignersStatus.CONNECTED,
          l1: {
            network: getWagmiChain(l1Network.chainID),
            provider: l1Provider
          },
          l2: {
            network: getWagmiChain(l2Network.chainID),
            provider: l2Provider
          }
        })
      })
      .catch(() => {
        // Web3Provider is connected to an L2 network. We instantiate a provider for the L1 network.
        if (providerChainId !== _selectedL2ChainId) {
          // Make sure the L2 provider chainid match the selected chainid
          setResult({
            status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
            chainId: providerChainId
          })
          return
        }
        getL2Network(provider as Web3Provider)
          .then(async l2Network => {
            const l1NetworkChainId = l2Network.partnerChainID
            const l1Provider = new StaticJsonRpcProvider(
              rpcURLs[l1NetworkChainId]
            )
            const l1Network = await getL1Network(l1Provider)

            const l2Provider = new StaticJsonRpcProvider(
              rpcURLs[l2Network.chainID]
            )

            console.log('Setting 2.')
            setResult({
              status: UseNetworksAndSignersStatus.CONNECTED,
              l1: {
                network: getWagmiChain(l1Network.chainID),
                provider: l1Provider
              },
              l2: {
                network: getWagmiChain(l2Network.chainID),
                provider: l2Provider
              }
            })
          })
          .catch(() => {
            setResult({
              status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
              chainId: providerChainId
            })
          })
      })
  }, [address, chain, provider, selectedL2ChainId, setQueryParams])

  useEffect(() => {
    update()
    // The `chain` object has to be in the list of dependencies for switching between L1-L2 pairs.
  }, [chain, update])

  if (result.status !== UseNetworksAndSignersStatus.CONNECTED) {
    const fallbackProps =
      result.status === UseNetworksAndSignersStatus.NOT_SUPPORTED
        ? { status: result.status }
        : { status: result.status }

    return props.fallback(fallbackProps)
  }

  return (
    <NetworksAndSignersContext.Provider value={result}>
      {props.children}
    </NetworksAndSignersContext.Provider>
  )
}
