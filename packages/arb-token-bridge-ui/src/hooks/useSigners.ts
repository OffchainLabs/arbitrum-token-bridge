import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@gimmixorg/use-wallet'
import { providers } from 'ethers'
import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'

import { L1Network, L2Network, getL1Network, getL2Network } from '@arbitrum/sdk'

type UseSignersError = 'network_not_connected' | 'network_not_supported'
type UseSignersResult =
  | {
      error: UseSignersError
    }
  | {
      error: false
      l1Signer: JsonRpcSigner
      l2Signer: JsonRpcSigner
    }

enum UseSignersNetworksError {
  NOT_CONNECTED,
  NOT_SUPPORTED
}
type UseSignersNetworks =
  | UseSignersNetworksError.NOT_CONNECTED
  | UseSignersNetworksError.NOT_SUPPORTED
  | {
      network: L1Network
      partnerNetwork: L2Network
      isArbitrum: false
    }
  | {
      network: L2Network
      partnerNetwork: L1Network
      isArbitrum: true
    }

export function useSigners(): UseSignersResult {
  const { account: address, provider, network: networkInfo } = useWallet()

  const [networks, setNetworks] = useState<UseSignersNetworks>(
    UseSignersNetworksError.NOT_CONNECTED
  )

  const updateNetworks = useCallback((_networkId: number) => {
    // Check if the network is an L1 network
    getL1Network(_networkId)
      // The network is an L1 network
      .then(async _network => {
        // TODO: Handle multiple partner networks
        const [_partnerNetworkChainId] = _network.partnerChainIDs
        const _partnerNetwork = await getL2Network(_partnerNetworkChainId)

        setNetworks({
          network: _network,
          partnerNetwork: _partnerNetwork,
          isArbitrum: false
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

            setNetworks({
              network: _network,
              partnerNetwork: _partnerNetwork,
              isArbitrum: true
            })
          })
          // The network is not supported
          .catch(() => setNetworks(UseSignersNetworksError.NOT_SUPPORTED))
      })
  }, [])

  useEffect(() => {
    if (typeof networkInfo === 'undefined') {
      return
    }

    updateNetworks(networkInfo.chainId)
  }, [networkInfo, updateNetworks])

  return useMemo(() => {
    if (networks === UseSignersNetworksError.NOT_CONNECTED) {
      return { error: 'network_not_connected' }
    }

    if (networks === UseSignersNetworksError.NOT_SUPPORTED) {
      return { error: 'network_not_supported' }
    }

    const partnerProvider = new providers.JsonRpcProvider(
      networks.partnerNetwork.rpcURL
    )

    if (networks.isArbitrum) {
      return {
        error: false,
        l1Signer: partnerProvider.getSigner(address!),
        l2Signer: provider?.getSigner(0) as JsonRpcSigner
      }
    }

    return {
      error: false,
      l1Signer: provider?.getSigner(0) as JsonRpcSigner,
      l2Signer: partnerProvider.getSigner(address!)
    }
  }, [address, provider, networks])
}
