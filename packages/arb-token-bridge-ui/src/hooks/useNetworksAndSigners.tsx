import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@arbitrum/use-wallet'
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

  return result
}
