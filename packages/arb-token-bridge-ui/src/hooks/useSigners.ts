import { useMemo } from 'react'
import { useWallet } from '@gimmixorg/use-wallet'
import { providers } from 'ethers'
import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'

import { useNetworks, UseNetworksStatus } from './useNetworks'

export enum UseSignersStatus {
  NETWORK_NOT_CONNECTED = 'network_not_connected',
  NETWORK_NOT_SUPPORTED = 'network_not_supported',
  SUCCESS = 'success'
}

export type UseSignersData = {
  l1Signer: JsonRpcSigner
  l2Signer: JsonRpcSigner
}

export type UseSignersResult =
  | { status: UseSignersStatus.NETWORK_NOT_CONNECTED }
  | { status: UseSignersStatus.NETWORK_NOT_SUPPORTED }
  | { status: UseSignersStatus.SUCCESS; data: UseSignersData }

export function useSigners(): UseSignersResult {
  const networks = useNetworks()
  const { account: address, provider } = useWallet()

  return useMemo(() => {
    if (networks.status === UseNetworksStatus.NOT_CONNECTED) {
      return { status: UseSignersStatus.NETWORK_NOT_CONNECTED }
    }

    if (networks.status === UseNetworksStatus.NOT_SUPPORTED) {
      return { status: UseSignersStatus.NETWORK_NOT_SUPPORTED }
    }

    const { l1Network, l2Network, isConnectedToArbitrum } = networks
    const partnerNetwork = isConnectedToArbitrum ? l1Network : l2Network
    const partnerProvider = new providers.JsonRpcProvider(partnerNetwork.rpcURL)

    if (isConnectedToArbitrum) {
      return {
        status: UseSignersStatus.SUCCESS,
        data: {
          l1Signer: partnerProvider.getSigner(address!),
          l2Signer: provider?.getSigner(0) as JsonRpcSigner
        }
      }
    }

    return {
      status: UseSignersStatus.SUCCESS,
      data: {
        l1Signer: provider?.getSigner(0) as JsonRpcSigner,
        l2Signer: partnerProvider.getSigner(address!)
      }
    }
  }, [networks, address, provider])
}
