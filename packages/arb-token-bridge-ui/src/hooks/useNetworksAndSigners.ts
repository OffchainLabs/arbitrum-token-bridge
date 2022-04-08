import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@gimmixorg/use-wallet'
import {
  JsonRpcSigner,
  JsonRpcProvider,
  Web3Provider
} from '@ethersproject/providers'
import { L1Network, L2Network, getL1Network, getL2Network } from '@arbitrum/sdk'

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

export function useNetworksAndSigners(): UseNetworksAndSignersResult {
  const { provider, account, network: networkInfo } = useWallet()

  const [result, setResult] = useState<UseNetworksAndSignersResult>({
    status: UseNetworksAndSignersStatus.NOT_CONNECTED,
    ...defaults
  })

  const update = useCallback(
    (web3Provider: Web3Provider, address: string, networkId: number) => {
      // Check if the network is an L1 network
      getL1Network(networkId)
        // The network is an L1 network
        .then(async l1Network => {
          // TODO: Handle multiple partner networks
          const [l2NetworkChainId] = l1Network.partnerChainIDs
          const l2Network = await getL2Network(l2NetworkChainId)

          const l2Provider = new JsonRpcProvider(
            l2Network.rpcURL || rpcURLs[l2Network.chainID]
          )

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
        // The network is not an L1 network
        .catch(() => {
          // Check if the network is an L2 network
          getL2Network(networkId)
            // The network is an L2 network
            .then(async l2Network => {
              const l1NetworkChainId = l2Network.partnerChainID
              const l1Network = await getL1Network(l1NetworkChainId)

              const l1Provider = new JsonRpcProvider(
                l1Network.rpcURL || rpcURLs[l1Network.chainID]
              )

              setResult({
                status: UseNetworksAndSignersStatus.CONNECTED,
                l1: {
                  network: l1Network,
                  signer: l1Provider.getSigner(address)
                },
                l2: {
                  network: l2Network,
                  signer: web3Provider.getSigner(0)
                },
                isConnectedToArbitrum: true
              })
            })
            // The network is not supported
            .catch(() =>
              setResult({
                status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
                ...defaults
              })
            )
        })
    },
    []
  )

  useEffect(() => {
    if (
      typeof provider === 'undefined' ||
      typeof account === 'undefined' ||
      typeof networkInfo === 'undefined'
    ) {
      return
    }

    update(provider, account, networkInfo.chainId)
  }, [provider, account, networkInfo, update])

  return result
}
