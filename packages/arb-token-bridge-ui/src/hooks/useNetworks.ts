import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@gimmixorg/use-wallet'
import { L1Network, L2Network, getL1Network, getL2Network } from '@arbitrum/sdk'

export enum UseNetworksStatus {
  NOT_CONNECTED = 'network_not_connected',
  NOT_SUPPORTED = 'network_not_supported',
  CONNECTED = 'network_connected'
}

export type UseNetworksDataUnknown = {
  l1Network: undefined
  l2Network: undefined
  isConnectedToArbitrum: undefined
}

export type UseNetworksData = {
  l1Network: L1Network
  l2Network: L2Network
  isConnectedToArbitrum: boolean
}

const defaults: UseNetworksDataUnknown = {
  l1Network: undefined,
  l2Network: undefined,
  isConnectedToArbitrum: undefined
}

export type UseNetworksResult =
  | ({ status: UseNetworksStatus.NOT_CONNECTED } & UseNetworksDataUnknown)
  | ({ status: UseNetworksStatus.NOT_SUPPORTED } & UseNetworksDataUnknown)
  | ({ status: UseNetworksStatus.CONNECTED } & UseNetworksData)

export function useNetworks(): UseNetworksResult {
  const { network: networkInfo } = useWallet()

  const [result, setResult] = useState<UseNetworksResult>({
    status: UseNetworksStatus.NOT_CONNECTED,
    ...defaults
  })

  const updateNetworks = useCallback((networkId: number) => {
    // Check if the network is an L1 network
    getL1Network(networkId)
      // The network is an L1 network
      .then(async l1Network => {
        // TODO: Handle multiple partner networks
        const [l2NetworkChainId] = l1Network.partnerChainIDs
        const l2Network = await getL2Network(l2NetworkChainId)

        setResult({
          status: UseNetworksStatus.CONNECTED,
          l1Network,
          l2Network,
          isConnectedToArbitrum: false
        })
      })
      // The network is not an L1 network
      .catch(() => {
        // Check if the network is an L2 network
        getL2Network(networkId)
          // The network is an L2 network
          .then(async l2Network => {
            const l1NetworkChainId = l2Network.partnerChainID
            const l1Network = await getL1Network(l1NetworkChainId)

            setResult({
              status: UseNetworksStatus.CONNECTED,
              l1Network,
              l2Network,
              isConnectedToArbitrum: true
            })
          })
          // The network is not supported
          .catch(() =>
            setResult({
              status: UseNetworksStatus.NOT_SUPPORTED,
              ...defaults
            })
          )
      })
  }, [])

  useEffect(() => {
    if (typeof networkInfo === 'undefined') {
      return
    }

    updateNetworks(networkInfo.chainId)
  }, [networkInfo, updateNetworks])

  return result
}
