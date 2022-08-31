import React, {
  useCallback,
  useEffect,
  useState,
  useContext,
  createContext
} from 'react'
import {
  JsonRpcSigner,
  JsonRpcProvider,
  Web3Provider
} from '@ethersproject/providers'
import { L1Network, L2Network, getL1Network, getL2Network } from '@arbitrum/sdk'
import { useWallet } from '@arbitrum/use-wallet'
import { useLatest } from 'react-use'

import { chainIdToDefaultL2ChainId, rpcURLs } from '../util/networks'
import { trackEvent } from '../util/AnalyticsUtils'
import { modalProviderOpts } from '../util/modelProviderOpts'

export enum UseNetworksAndSignersStatus {
  LOADING = 'loading',
  NOT_CONNECTED = 'not_connected',
  NOT_SUPPORTED = 'not_supported',
  CONNECTED = 'connected'
}

export type UseNetworksAndSignersLoadingOrErrorStatus =
  | UseNetworksAndSignersStatus.LOADING
  | UseNetworksAndSignersStatus.NOT_CONNECTED
  | UseNetworksAndSignersStatus.NOT_SUPPORTED

const defaultStatus =
  typeof window.web3 === 'undefined'
    ? UseNetworksAndSignersStatus.NOT_CONNECTED
    : UseNetworksAndSignersStatus.LOADING

type UseNetworksAndSignersLoadingOrErrorResult = {
  status: UseNetworksAndSignersLoadingOrErrorStatus
}

type UseNetworksAndSignersConnectedResult = {
  status: UseNetworksAndSignersStatus.CONNECTED
  l1: { network: L1Network; signer: JsonRpcSigner }
  l2: { network: L2Network; signer: JsonRpcSigner }
  isConnectedToArbitrum: boolean
}

export type UseNetworksAndSignersResult =
  | UseNetworksAndSignersLoadingOrErrorResult
  | UseNetworksAndSignersConnectedResult

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
  fallback: (status: UseNetworksAndSignersLoadingOrErrorStatus) => JSX.Element
  /**
   * Renders on successful connection.
   */
  children: React.ReactNode
}

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

export function NetworksAndSignersProvider(
  props: NetworksAndSignersProviderProps
): JSX.Element {
  const { selectedL2ChainId } = props
  const { provider, account, network, connect } = useWallet()

  const [result, setResult] = useState<UseNetworksAndSignersResult>({
    status: defaultStatus
  })
  const latestResult = useLatest(result)

  // Reset back to the not connected state in case the user manually disconnects through their wallet
  useEffect(() => {
    const connected = result.status === UseNetworksAndSignersStatus.CONNECTED

    if (connected && typeof account === 'undefined') {
      setResult({ status: UseNetworksAndSignersStatus.NOT_CONNECTED })
    }
  }, [account, result])

  useEffect(() => {
    async function tryConnect() {
      try {
        const connection = await connect(modalProviderOpts)
        const providerName = getProviderName(connection.provider.provider)

        if (providerName) {
          trackEvent(`Connect Wallet Click: ${providerName}`)
        }
      } catch (error) {
        setResult({ status: UseNetworksAndSignersStatus.NOT_CONNECTED })
      }
    }

    tryConnect()
  }, [connect])

  // TODO: Don't run all of this when an account switch happens. Just derive signers from networks?
  const update = useCallback(
    async (web3Provider: Web3Provider, address: string) => {
      const providerChainId = (await web3Provider.getNetwork()).chainId

      let _selectedL2ChainId = selectedL2ChainId
      if (_selectedL2ChainId === undefined) {
        // If l2ChainId is undefined, use a default L2 based on the connected provider chainid
        _selectedL2ChainId = chainIdToDefaultL2ChainId[providerChainId]
        if (_selectedL2ChainId === undefined) {
          console.error(`Unknown provider chainId: ${providerChainId}`)
          setResult({ status: UseNetworksAndSignersStatus.NOT_SUPPORTED })
          return
        }
      }

      getL1Network(web3Provider, _selectedL2ChainId!)
        .then(async l1Network => {
          // Web3Provider is connected to an L1 network. We instantiate a provider for the L2 network.
          const l2Provider = new JsonRpcProvider(rpcURLs[_selectedL2ChainId!])
          const l2Network = await getL2Network(l2Provider)

          setResult({
            status: UseNetworksAndSignersStatus.CONNECTED,
            l1: {
              network: l1Network,
              signer: web3Provider.getSigner(0)
            },
            l2: {
              network: l2Network,
              signer: l2Provider.getSigner(address!)
            },
            isConnectedToArbitrum: false
          })
        })
        .catch(() => {
          // Web3Provider is connected to an L2 network. We instantiate a provider for the L1 network.
          if (providerChainId != _selectedL2ChainId) {
            // Make sure the L2 provider chainid match the selected chainid
            setResult({ status: UseNetworksAndSignersStatus.NOT_SUPPORTED })
            return
          }
          getL2Network(web3Provider)
            .then(async l2Network => {
              const l1NetworkChainId = l2Network.partnerChainID
              const l1Provider = new JsonRpcProvider(rpcURLs[l1NetworkChainId])
              const l1Network = await getL1Network(
                l1Provider,
                _selectedL2ChainId!
              )

              setResult({
                status: UseNetworksAndSignersStatus.CONNECTED,
                l1: {
                  network: l1Network,
                  signer: l1Provider.getSigner(address!)
                },
                l2: {
                  network: l2Network,
                  signer: web3Provider.getSigner(0)
                },
                isConnectedToArbitrum: true
              })
            })
            .catch(() => {
              setResult({ status: UseNetworksAndSignersStatus.NOT_SUPPORTED })
            })
        })
    },
    [latestResult, selectedL2ChainId]
  )

  useEffect(() => {
    if (provider && account && network) {
      update(provider, account)
    }
    // The `network` object has to be in the list of dependencies for switching between L1-L2 pairs.
  }, [provider, account, network, update])

  if (result.status !== UseNetworksAndSignersStatus.CONNECTED) {
    return props.fallback(result.status)
  }

  return (
    <NetworksAndSignersContext.Provider value={result}>
      {props.children}
    </NetworksAndSignersContext.Provider>
  )
}
