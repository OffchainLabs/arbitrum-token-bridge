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

import { rpcURLs } from '../util/networks'

export enum UseNetworksAndSignersStatus {
  NOT_CONNECTED = 'network_not_connected',
  NOT_SUPPORTED = 'network_not_supported',
  CONNECTED = 'network_connected'
}

export type UseNetworksAndSignersDataUnknown = {
  l1: { network: undefined; signer: undefined }
  l2: { network: undefined; signer: undefined }
  isConnectedToArbitrum: undefined
}

export type UseNetworksAndSignersData = {
  l1: { network: L1Network; signer: JsonRpcSigner }
  l2: { network: L2Network; signer: JsonRpcSigner }
  isConnectedToArbitrum: boolean
}

const defaults: UseNetworksAndSignersDataUnknown = {
  l1: { network: undefined, signer: undefined },
  l2: { network: undefined, signer: undefined },
  isConnectedToArbitrum: undefined
}

export type UseNetworksAndSignersResult =
  | ({
      status: UseNetworksAndSignersStatus.NOT_CONNECTED
    } & UseNetworksAndSignersDataUnknown)
  | ({
      status: UseNetworksAndSignersStatus.NOT_SUPPORTED
    } & UseNetworksAndSignersDataUnknown)
  | ({
      status: UseNetworksAndSignersStatus.CONNECTED
    } & UseNetworksAndSignersData)

export const NetworksAndSignersContext =
  createContext<UseNetworksAndSignersResult>({
    status: UseNetworksAndSignersStatus.NOT_CONNECTED,
    ...defaults
  })

export function useNetworksAndSigners() {
  return useContext(NetworksAndSignersContext)
}

export type NetworksAndSignersProviderProps = {
  /**
   * Render prop that gets called with the current status in case of an unsuccessful connection or connection to an unsupported network.
   *
   * @see https://reactjs.org/docs/render-props.html
   */
  fallback: (
    status:
      | UseNetworksAndSignersStatus.NOT_CONNECTED
      | UseNetworksAndSignersStatus.NOT_SUPPORTED
  ) => JSX.Element
  /**
   * Renders on successful connection.
   */
  children: React.ReactNode
}

export function NetworksAndSignersProvider(
  props: NetworksAndSignersProviderProps
): JSX.Element {
  const { provider, account, network } = useWallet()

  const [result, setResult] = useState<UseNetworksAndSignersResult>({
    status: UseNetworksAndSignersStatus.NOT_CONNECTED,
    ...defaults
  })

  // TODO: Don't run all of this when an account switch happens. Just derive signers from networks?
  const update = useCallback((web3Provider: Web3Provider, address: string) => {
    getL1Network(web3Provider)
      .then(async l1Network => {
        // Web3Provider is connected to an L1 network. We instantiate a provider for the L2 network.
        const [l2NetworkChainId] = l1Network.partnerChainIDs
        const l2Provider = new JsonRpcProvider(rpcURLs[l2NetworkChainId])
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
        getL2Network(web3Provider)
          .then(async l2Network => {
            // Web3Provider is connected to an L2 network. We instantiate a provider for the L1 network.
            const l1NetworkChainId = l2Network.partnerChainID
            const l1Provider = new JsonRpcProvider(rpcURLs[l1NetworkChainId])
            const l1Network = await getL1Network(l1Provider)

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
            setResult({
              status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
              ...defaults
            })
          })
      })
  }, [])

  useEffect(() => {
    if (provider && account && network) {
      update(provider, account)
    }
    // The `network` object has to be in the list of dependencies for switching between L1-L2 pairs.
  }, [provider, account, network, update])

  return (
    <NetworksAndSignersContext.Provider value={result}>
      {result.status === UseNetworksAndSignersStatus.CONNECTED
        ? props.children
        : props.fallback(result.status)}
    </NetworksAndSignersContext.Provider>
  )
}
