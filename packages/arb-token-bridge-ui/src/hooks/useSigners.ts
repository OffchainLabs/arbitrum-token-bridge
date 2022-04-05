import { useMemo } from 'react'
import { useWallet } from '@gimmixorg/use-wallet'
import { providers } from 'ethers'
import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'

import { useNetworks, UseNetworksStatus } from './useNetworks'
import { rpcURLs } from '../util/networks'

export enum UseSignersStatus {
  NETWORK_NOT_CONNECTED = 'network_not_connected',
  NETWORK_NOT_SUPPORTED = 'network_not_supported',
  SUCCESS = 'success'
}

export type UseSignersDataUnknown = {
  l1Signer: undefined
  l2Signer: undefined
}

export type UseSignersData = {
  l1Signer: JsonRpcSigner
  l2Signer: JsonRpcSigner
}

export type UseSignersResult =
  | ({ status: UseSignersStatus.NETWORK_NOT_CONNECTED } & UseSignersDataUnknown)
  | ({ status: UseSignersStatus.NETWORK_NOT_SUPPORTED } & UseSignersDataUnknown)
  | ({ status: UseSignersStatus.SUCCESS } & UseSignersData)

const defaults: UseSignersDataUnknown = {
  l1Signer: undefined,
  l2Signer: undefined
}

export function useSigners(): UseSignersResult {
  const networks = useNetworks()
  const { account: address, provider } = useWallet()

  return useMemo(() => {
    if (
      typeof provider === 'undefined' ||
      networks.status === UseNetworksStatus.NOT_CONNECTED
    ) {
      return { status: UseSignersStatus.NETWORK_NOT_CONNECTED, ...defaults }
    }

    if (networks.status === UseNetworksStatus.NOT_SUPPORTED) {
      return { status: UseSignersStatus.NETWORK_NOT_SUPPORTED, ...defaults }
    }

    const { l1Network, l2Network, isConnectedToArbitrum } = networks
    const partnerNetwork = isConnectedToArbitrum ? l1Network : l2Network
    const partnerProvider = new providers.JsonRpcProvider(
      partnerNetwork.rpcURL || rpcURLs[partnerNetwork.chainID]
    )

    if (isConnectedToArbitrum) {
      return {
        status: UseSignersStatus.SUCCESS,
        l1Signer: partnerProvider.getSigner(address!),
        l2Signer: provider.getSigner(0) as JsonRpcSigner
      }
    }

    return {
      status: UseSignersStatus.SUCCESS,
      l1Signer: provider.getSigner(0) as JsonRpcSigner,
      l2Signer: partnerProvider.getSigner(address!)
    }
  }, [networks, address, provider])
}
