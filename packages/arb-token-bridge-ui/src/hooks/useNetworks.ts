import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@gimmixorg/use-wallet'
import { L1Network, L2Network, getL1Network, getL2Network } from '@arbitrum/sdk'

export enum UseNetworksStatus {
  NOT_CONNECTED = 'network_not_connected',
  NOT_SUPPORTED = 'network_not_supported',
  CONNECTED = 'network_connected'
}

export type UseNetworksData =
  | { network: L1Network; partnerNetwork: L2Network; isArbitrum: false }
  | { network: L2Network; partnerNetwork: L1Network; isArbitrum: true }

export type UseNetworksResult =
  | { status: UseNetworksStatus.NOT_CONNECTED }
  | { status: UseNetworksStatus.NOT_SUPPORTED }
  | { status: UseNetworksStatus.CONNECTED; data: UseNetworksData }

export function useNetworks(): UseNetworksResult {
  const { network: networkInfo } = useWallet()

  const [result, setResult] = useState<UseNetworksResult>({
    status: UseNetworksStatus.NOT_CONNECTED
  })

  const updateNetworks = useCallback((_networkId: number) => {
    // Check if the network is an L1 network
    getL1Network(_networkId)
      // The network is an L1 network
      .then(async _network => {
        // TODO: Handle multiple partner networks
        const [_partnerNetworkChainId] = _network.partnerChainIDs
        const _partnerNetwork = await getL2Network(_partnerNetworkChainId)

        setResult({
          status: UseNetworksStatus.CONNECTED,
          data: {
            network: _network,
            partnerNetwork: _partnerNetwork,
            isArbitrum: false
          }
        })
      })
      // The network is not an L1 network
      .catch(() => {
        // Check if the network is an L2 network
        getL2Network(_networkId)
          // The network is an L2 network
          .then(async _network => {
            const _partnerNetworkChainId = _network.partnerChainID
            const _partnerNetwork = await getL1Network(_partnerNetworkChainId)

            setResult({
              status: UseNetworksStatus.CONNECTED,
              data: {
                network: _network,
                partnerNetwork: _partnerNetwork,
                isArbitrum: true
              }
            })
          })
          // The network is not supported
          .catch(() => setResult({ status: UseNetworksStatus.NOT_SUPPORTED }))
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
