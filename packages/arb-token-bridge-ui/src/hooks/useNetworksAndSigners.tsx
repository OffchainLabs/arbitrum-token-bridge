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

import { rpcURLs } from '../util/networks'
import { modalProviderOpts } from '../util/modelProviderOpts'

export enum UseNetworksAndSignersStatus {
  LOADING = 'loading',
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

const defaultStatus =
  typeof window.web3 === 'undefined'
    ? UseNetworksAndSignersStatus.NOT_CONNECTED
    : UseNetworksAndSignersStatus.LOADING

export type UseNetworksAndSignersResult =
  | ({
      status:
        | UseNetworksAndSignersStatus.LOADING
        | UseNetworksAndSignersStatus.NOT_CONNECTED
        | UseNetworksAndSignersStatus.NOT_SUPPORTED
    } & UseNetworksAndSignersDataUnknown)
  | ({
      status: UseNetworksAndSignersStatus.CONNECTED
    } & UseNetworksAndSignersData)

export const NetworksAndSignersContext =
  createContext<UseNetworksAndSignersResult>({
    ...defaults,
    status: defaultStatus
  })

export function useNetworksAndSigners() {
  return useContext(NetworksAndSignersContext)
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
  fallback: (
    status:
      | UseNetworksAndSignersStatus.LOADING
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
  const { selectedL2ChainId } = props

  const { provider, account, network, connect, web3Modal } = useWallet()
  const cachedProvider = web3Modal?.cachedProvider

  const [result, setResult] = useState<UseNetworksAndSignersResult>({
    ...defaults,
    status: defaultStatus
  })
  const latestResult = useLatest(result)

  // In case the user manually disconnects, reset to `NOT_CONNECTED` state
  useEffect(() => {
    if (cachedProvider === '') {
      setResult({
        ...defaults,
        status: UseNetworksAndSignersStatus.NOT_CONNECTED
      })
    }
  }, [cachedProvider])

  useEffect(() => {
    async function tryConnect() {
      try {
        await connect(modalProviderOpts)
      } catch (error) {
        setResult({
          ...defaults,
          status: UseNetworksAndSignersStatus.NOT_CONNECTED
        })
      }
    }

    tryConnect()
  }, [connect])

  // TODO: Don't run all of this when an account switch happens. Just derive signers from networks?
  const update = useCallback(
    async (web3Provider: Web3Provider, address: string) => {
      async function isSwitchingToPartnerNetwork() {
        const nextChainId = (await web3Provider.getNetwork()).chainId
        const current = latestResult.current

        if (current.isConnectedToArbitrum) {
          return nextChainId === current.l2.network.partnerChainID
        }

        return current.l1.network?.partnerChainIDs.includes(nextChainId)
      }

      // Don't switch to loading state when switching to partner network
      if (!(await isSwitchingToPartnerNetwork())) {
        setResult({ ...defaults, status: UseNetworksAndSignersStatus.LOADING })
      }

      getL1Network(web3Provider)
        .then(async l1Network => {
          function getL2NetworkChainId(): number {
            // Use the first chain id from `partnerChainIDs` as default
            const defaultL2NetworkChainId = l1Network.partnerChainIDs[0]

            // Return the default if no preference for L2 chain
            if (!selectedL2ChainId) {
              return defaultL2NetworkChainId
            }

            // Return the default if the preffered L2 chain id doesn't match the L1 network
            if (!l1Network.partnerChainIDs.includes(selectedL2ChainId)) {
              return defaultL2NetworkChainId
            }

            return selectedL2ChainId
          }

          // Web3Provider is connected to an L1 network. We instantiate a provider for the L2 network.
          const l2NetworkChainId = getL2NetworkChainId()
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
    },
    [latestResult, selectedL2ChainId]
  )

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
