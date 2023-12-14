/*

Hooks and utility functions written to maintain L1 and L2 connnection state (using context) and their metadata across the Bridge UI.
These can be used to answer and access the following use-cases across the app -

1. Is the network connected? If yes, is it Arbitrum (L2) or Ethereum (L1)?
2. Signer exposed by the wallet to sign and execute RPC transactions
3. Provider exposed by the wallet to query the blockchain

*/

import React, {
  useRef,
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
import { getChain, getParentChain } from '@arbitrum/sdk'
import { Chain, useAccount, useNetwork, useProvider } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useLocalStorage } from 'react-use'
import * as Sentry from '@sentry/react'

import { useIsConnectedToOrbitChain } from './useIsConnectedToOrbitChain'
import { useIsConnectedToArbitrum } from './useIsConnectedToArbitrum'
import {
  chainIdToDefaultL2ChainId,
  getNetworkName,
  isNetwork,
  rpcURLs
} from '../util/networks'
import { getWagmiChain } from '../util/wagmi/getWagmiChain'
import { useArbQueryParams } from './useArbQueryParams'
import { trackEvent } from '../util/AnalyticsUtils'
import { errorToast } from '../components/common/atoms/Toast'

import { TOS_LOCALSTORAGE_KEY } from '../constants'

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
  typeof global.window?.ethereum === 'undefined'
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
  | 'Other'

// connector names: https://github.com/wagmi-dev/wagmi/blob/b17c07443e407a695dfe9beced2148923b159315/docs/pages/core/connectors/_meta.en-US.json#L4
function getWalletName(connectorName: string): ProviderName {
  switch (connectorName) {
    case 'MetaMask':
    case 'Coinbase Wallet':
    case 'Trust Wallet':
    case 'Safe':
    case 'Injected':

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
  const isConnectedToOrbitChain = useIsConnectedToOrbitChain()

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

    // set a custom tag in sentry to filter issues by connected wallet.name
    Sentry.setTag('wallet.name', connector?.name ?? '')
  }, [isDisconnected, isConnected, connector])

  useEffect(() => {
    if (result.status !== UseNetworksAndSignersStatus.CONNECTED) {
      return
    }

    Sentry.setTag('network.parent_chain_id', result.l1.network.id)
    Sentry.setTag(
      'network.parent_chain_rpc_url',
      getBaseUrl(rpcURLs[result.l1.network.id] ?? '')
    )

    Sentry.setTag('network.child_chain_id', result.l2.network.id)
    Sentry.setTag(
      'network.child_chain_rpc_url',
      getBaseUrl(rpcURLs[result.l2.network.id] ?? '')
    )
  }, [result])

  useEffect(() => {
    if (isTosAccepted) {
      openConnectModal?.()
    }
  }, [isTosAccepted, openConnectModal])

  const invocationCounter = useRef(0)

  // TODO: Don't run all of this when an account switch happens. Just derive signers from networks?
  const update = useCallback(async () => {
    if (!address || !chain) {
      return
    }

    // making sure the latest state is applied
    invocationCounter.current += 1
    const thisInvocation = invocationCounter.current

    const providerChainId = chain.id
    const chainNotSupported = !(providerChainId in chainIdToDefaultL2ChainId)

    if (chainNotSupported) {
      console.error(`Chain ${providerChainId} not supported`)
      if (thisInvocation !== invocationCounter.current) {
        // don't apply if the iteration is not the latest
        return
      }
      setResult({
        status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
        chainId: providerChainId
      })
      return
    }

    /***
     * Case 1: Connected to an Orbit chain & Arbitrum is 'preferredL2ChainId.' Need to set 'preferredL2ChainId' to an Orbit chain.
     * Case 2: selectedChainId is defined but not supported by provider => reset query params -> case 1
     * Case 3: selectedChainId is defined but not supported by provider => reset query params -> case 1
     * Case 4: selectedChainId is defined and supported, continue
     */
    const isSelectedL2ChainArbitrum = isNetwork(selectedL2ChainId!).isArbitrum
    let _selectedL2ChainId = selectedL2ChainId
    const providerSupportedL2 = chainIdToDefaultL2ChainId[providerChainId]!

    // Case 1: Connected to an Orbit chain & Arbitrum is 'preferredL2ChainId'. Need to set 'preferredL2ChainId' to an Orbit chain.
    if (isConnectedToOrbitChain && isSelectedL2ChainArbitrum) {
      if (thisInvocation !== invocationCounter.current) {
        // don't apply if the iteration is not the latest
        return
      }
      setQueryParams({ l2ChainId: providerChainId })
      return
    }

    // Case 2: use a default L2 based on the connected provider chainid
    _selectedL2ChainId = _selectedL2ChainId || providerSupportedL2[0]
    if (typeof _selectedL2ChainId === 'undefined') {
      console.error(`Unknown provider chainId: ${providerChainId}`)
      setResult({
        status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
        chainId: providerChainId
      })
      return
    }

    // Case 3: L2 is not supported by provider
    if (!providerSupportedL2.includes(_selectedL2ChainId)) {
      // remove the l2chainId, keeping the rest of the params intact
      setQueryParams({
        l2ChainId: undefined
      })

      return
    }

    // Case 4
    getParentChain(provider as Web3Provider)
      .then(async parentChain => {
        const isParentChainArbitrum = isNetwork(parentChain.chainID).isArbitrum

        // There's no preferred L2 set, but Arbitrum is the ParentChain.
        if (isParentChainArbitrum && !selectedL2ChainId) {
          // By default, we want Arbitrum to be paired with Ethereum instead of an Orbit chain in our UI.
          // This is so we default users to their preferred case: Withdrawal from Arbitrum to Ethereum.
          // However, the current flow would set it to Arbitrum's partner Orbit chain.

          // We jump to 'getChain'. This means Arbitrum will be considered an L2 and paired with Ethereum.
          throw new Error()
        }

        // Web3Provider is connected to a ParentChain. We instantiate a provider for the Chain.
        const chainProvider = new StaticJsonRpcProvider(
          rpcURLs[_selectedL2ChainId!] // _selectedL2ChainId is defined here because of L185
        )
        const chain = await getChain(chainProvider)

        if (isParentChainArbitrum && isSelectedL2ChainArbitrum) {
          // Special case if user selects an Ethereum-Orbit pair in the UI.
          // Before the switch happens, Arbitrum is the preferred L2 chain (in query params), but L1 is also Arbitrum, hence such if statement.

          // We know our 'chain' is Arbitrum, we need to set 'parentChain' to Ethereum (Arbitrum's 'partnerChainID').
          parentChain = await getParentChain(chain.partnerChainID)
        }

        // from the ParentChain, instantiate the provider for that too
        // - done to feed into a consistent l1-l2 network-signer result state both having signer+providers
        const parentProvider = new StaticJsonRpcProvider(
          rpcURLs[parentChain.chainID]
        )

        if (thisInvocation !== invocationCounter.current) {
          // don't apply if the iteration is not the latest
          return
        }
        setResult({
          status: UseNetworksAndSignersStatus.CONNECTED,
          l1: {
            network: getWagmiChain(parentChain.chainID),
            provider: parentProvider
          },
          l2: {
            network: getWagmiChain(chain.chainID),
            provider: chainProvider
          }
        })

        // set the child(l2/l3) chain id in query params so that it remembers it when switching back from parent
        // else, the child chain will reset to default when switching back from parent
        setQueryParams({
          l2ChainId: chain.chainID
        })
      })
      .catch(error => {
        // Web3Provider is connected to a Chain. We instantiate a provider for the ParentChain.
        if (providerChainId !== _selectedL2ChainId && !isConnectedToArbitrum) {
          // Make sure the Chain provider chainid match the selected chainid
          // We continue the check if connected to Arbitrum, because Arbitrum can be either ParentChain or Chain.
          setResult({
            status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
            chainId: providerChainId
          })
          return
        }

        // show a toast message if connecting to the valid network resulted in failure
        if (_selectedL2ChainId && error && error.event === 'noNetwork') {
          errorToast(
            `Failed to connect to ${getNetworkName(_selectedL2ChainId)}.`
          )
        }

        getChain(provider as Web3Provider)
          .then(async chain => {
            const parentChainId = chain.partnerChainID
            const parentProvider = new StaticJsonRpcProvider(
              rpcURLs[parentChainId]
            )
            const parentChain = await getParentChain(parentProvider)

            const chainProvider = new StaticJsonRpcProvider(
              rpcURLs[chain.chainID]
            )

            if (thisInvocation !== invocationCounter.current) {
              // don't apply if the iteration is not the latest
              return
            }
            setResult({
              status: UseNetworksAndSignersStatus.CONNECTED,
              l1: {
                network: getWagmiChain(parentChain.chainID),
                provider: parentProvider
              },
              l2: {
                network: getWagmiChain(chain.chainID),
                provider: chainProvider
              }
            })

            // set the child(l2/l3) chain id in query params so that it remembers it when switching back from parent
            // else, the child chain will reset to default when switching back from parent
            setQueryParams({
              l2ChainId: chain.chainID
            })
          })
          .catch(() => {
            if (thisInvocation !== invocationCounter.current) {
              // don't apply if the iteration is not the latest
              return
            }
            setResult({
              status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
              chainId: providerChainId
            })
          })
      })
  }, [
    address,
    chain,
    provider,
    selectedL2ChainId,
    setQueryParams,
    isConnectedToArbitrum,
    isConnectedToOrbitChain
  ])

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
