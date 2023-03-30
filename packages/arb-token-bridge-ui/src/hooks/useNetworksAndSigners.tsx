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
  StaticJsonRpcProvider
} from '@ethersproject/providers'
import { L1Network, L2Network, getL1Network, getL2Network } from '@arbitrum/sdk'
import { Signer } from 'ethers'

import { chainIdToDefaultL2ChainId, rpcURLs } from '../util/networks'
import { useArbQueryParams } from './useArbQueryParams'
import { trackEvent } from '../util/AnalyticsUtils'
import { addressIsSmartContract } from '../util/AddressUtils'

import { ApiResponseSuccess } from '../pages/api/screenings'
import {
  useAccount,
  useConnect,
  useNetwork,
  useProvider,
  useSigner
} from 'wagmi'

export enum UseNetworksAndSignersStatus {
  LOADING = 'loading',
  NOT_CONNECTED = 'not_connected',
  NOT_SUPPORTED = 'not_supported',
  BLOCKED = 'blocked',
  CONNECTED = 'connected'
}

export type UseNetworksAndSignersLoadingOrErrorStatus =
  | UseNetworksAndSignersStatus.LOADING
  | UseNetworksAndSignersStatus.NOT_CONNECTED

export type UseNetworksAndSignersNotSupportedStatus =
  UseNetworksAndSignersStatus.NOT_SUPPORTED

export type UseNetworksAndSignersBlockedStatus =
  UseNetworksAndSignersStatus.BLOCKED

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

export type UseNetworksAndSignersBlockedResult = {
  status: UseNetworksAndSignersStatus.BLOCKED
  address: string
}

export type UseNetworksAndSignersConnectedResult = {
  status: UseNetworksAndSignersStatus.CONNECTED
  l1: {
    network: L1Network
    signer: Signer
    provider: JsonRpcProvider
  }
  l2: {
    network: L2Network
    signer: Signer
    provider: JsonRpcProvider
  }
  isConnectedToArbitrum: boolean
  chainId: number // the current chainId which is connected to UI
  isSmartContractWallet: boolean
}

export type UseNetworksAndSignersResult =
  | UseNetworksAndSignersLoadingOrErrorResult
  | UseNetworksAndSignersConnectedResult
  | UseNetworksAndSignersNotSupportedResult
  | UseNetworksAndSignersBlockedResult

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
  | { status: UseNetworksAndSignersNotSupportedStatus; chainId: number }
  | { status: UseNetworksAndSignersStatus.BLOCKED; address: string }

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
export type ProviderName = 'MetaMask' | 'Coinbase Wallet' | 'WalletConnect'

function getProviderName(provider: any): ProviderName | null {
  if (provider.isMetaMask) {
    return 'MetaMask'
  }

  if (provider.isCoinbaseWallet) {
    return 'Coinbase Wallet'
  }

  if (provider.isWalletConnect) {
    return 'WalletConnect'
  }

  return null
}

async function isBlocked(address: `0x${string}`): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') {
    return false
  }

  const searchParams = new URLSearchParams({ address })
  const response = await fetch('/api/screenings?' + searchParams, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    return false
  }

  return ((await response.json()) as ApiResponseSuccess).blocked
}

export function NetworksAndSignersProvider(
  props: NetworksAndSignersProviderProps
): JSX.Element {
  const { selectedL2ChainId } = props
  const {
    address,
    connector: activeConnector,
    isConnecting,
    isDisconnected,
    isConnected
  } = useAccount()
  const {
    connect: wagmiConnect,
    connectors,
    error,
    isLoading: isLoadingUseConnect,
    pendingConnector
  } = useConnect()
  const { data: signer, isError, isLoading: isLoadingUseSigner } = useSigner()
  const { chain } = useNetwork()
  const provider = useProvider()
  // const { provider, network, connect } = useWallet()
  const [result, setResult] = useState<UseNetworksAndSignersResult>({
    status: defaultStatus
  })

  const [, setQueryParams] = useArbQueryParams()

  // Reset back to the not connected state in case the user manually disconnects through their wallet
  useEffect(() => {
    if (isDisconnected || !isConnected) {
      setResult({ status: UseNetworksAndSignersStatus.NOT_CONNECTED })
    }
  }, [isDisconnected, isConnected])

  // When user clicks on any of the wallets to connect at the start of the session
  // useEffect(() => {
  //   async function tryConnect() {
  //     try {
  //       const connection = await connect(modalProviderOpts)
  //       const providerName = getProviderName(connection.provider.provider)

  //       if (providerName) {
  //         trackEvent(`Connect Wallet Click: ${providerName}`)
  //       }
  //     } catch (error) {
  //       setResult({ status: UseNetworksAndSignersStatus.NOT_CONNECTED })
  //     }
  //   }

  //   // tryConnect()
  // }, [connect])

  // TODO: Don't run all of this when an account switch happens. Just derive signers from networks?
  const update = useCallback(async () => {
    if (!address || !chain) {
      return
    }
    const blocked = await isBlocked(address)

    if (blocked) {
      setResult({
        status: UseNetworksAndSignersStatus.BLOCKED,
        address: address as string
      })
      trackEvent('Address Block')
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

    /***
     * Case 1: selectedChainId is undefined => set it to provider's default L2
     * Case 2: selectedChainId is defined but not supported by provider => reset query params -> case 1
     * Case 3: selectedChainId is defined and supported, continue
     */
    let _selectedL2ChainId = selectedL2ChainId
    const providerSupportedL2 = chainIdToDefaultL2ChainId[providerChainId]!

    // Case 1: use a default L2 based on the connected provider chainid
    _selectedL2ChainId = _selectedL2ChainId || providerSupportedL2[0]
    if (typeof _selectedL2ChainId === 'undefined') {
      console.error(`Unknown provider chainId: ${providerChainId}`)
      setResult({
        status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
        chainId: providerChainId
      })
      return
    }

    // Case 2: L2 is not supported by provider
    if (!providerSupportedL2.includes(_selectedL2ChainId)) {
      // remove the l2chainId, keeping the rest of the params intact
      setQueryParams({
        l2ChainId: undefined
      })

      return
    }

    // Case 3
    getL1Network(provider)
      .then(async l1Network => {
        // Web3Provider is connected to an L1 network. We instantiate a provider for the L2 network.
        const l2Provider = new StaticJsonRpcProvider(
          rpcURLs[_selectedL2ChainId!] // _selectedL2ChainId is defined here because of L185
        )
        const l2Network = await getL2Network(l2Provider)

        // from the L1 network, instantiate the provider for that too
        // - done to feed into a consistent l1-l2 network-signer result state both having signer+providers
        const l1Provider = new StaticJsonRpcProvider(rpcURLs[l1Network.chainID])

        setResult({
          status: UseNetworksAndSignersStatus.CONNECTED,
          l1: {
            network: l1Network,
            signer: l1Provider.getSigner(address),
            provider: l1Provider
          },
          l2: {
            network: l2Network,
            signer: l2Provider.getSigner(address),
            provider: l2Provider
          },
          isConnectedToArbitrum: false,
          chainId: l1Network.chainID,
          isSmartContractWallet: await addressIsSmartContract(
            address as string,
            l1Provider
          )
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
        getL2Network(provider)
          .then(async l2Network => {
            const l1NetworkChainId = l2Network.partnerChainID
            const l1Provider = new StaticJsonRpcProvider(
              rpcURLs[l1NetworkChainId]
            )
            const l1Network = await getL1Network(l1Provider)

            const l2Provider = new StaticJsonRpcProvider(
              rpcURLs[l2Network.chainID]
            )

            setResult({
              status: UseNetworksAndSignersStatus.CONNECTED,
              l1: {
                network: l1Network,
                signer: l1Provider.getSigner(address),
                provider: l1Provider
              },
              l2: {
                network: l2Network,
                signer: l2Provider.getSigner(address),
                provider: l2Provider
              },
              isConnectedToArbitrum: true,
              chainId: l2Network.chainID,
              isSmartContractWallet: await addressIsSmartContract(
                address,
                l2Provider
              )
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
    if (result.status === UseNetworksAndSignersStatus.BLOCKED) {
      return props.fallback(result)
    }

    const fallbackProps =
      result.status === UseNetworksAndSignersStatus.NOT_SUPPORTED
        ? {
            status: result.status,
            chainId: result.chainId
          }
        : { status: result.status }

    return props.fallback(fallbackProps)
  }

  return (
    <NetworksAndSignersContext.Provider value={result}>
      {props.children}
    </NetworksAndSignersContext.Provider>
  )
}
