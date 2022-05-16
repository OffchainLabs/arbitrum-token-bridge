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

const L1ChainIds = [1, 4]
const L2ChainIds = [42161, 421611]

const L1NetworkCache: { [chainId: number]: L1Network } = {}
const L2NetworkCache: { [chainId: number]: L2Network } = {}

export function useNetworksAndSigners(): UseNetworksAndSignersResult {
  const { provider, account, network: networkInfo } = useWallet()

  const [result, setResult] = useState<UseNetworksAndSignersResult>({
    status: UseNetworksAndSignersStatus.NOT_CONNECTED,
    ...defaults
  })

  const update = useCallback(
    async (web3Provider: Web3Provider, address: string, networkId: number) => {
      if (L1ChainIds.includes(networkId)) {
        let l1Network: L1Network

        if (L1NetworkCache[networkId]) {
          l1Network = L1NetworkCache[networkId]
        } else {
          l1Network = await getL1Network(web3Provider)
          L1NetworkCache[networkId] = l1Network
        }

        const [l2NetworkChainId] = l1Network.partnerChainIDs
        const l2Provider = new JsonRpcProvider(rpcURLs[l2NetworkChainId])

        let l2Network: L2Network

        if (L2NetworkCache[networkId]) {
          l2Network = L2NetworkCache[networkId]
        } else {
          l2Network = await getL2Network(l2Provider)
          L2NetworkCache[networkId] = l2Network
        }

        setResult({
          status: UseNetworksAndSignersStatus.CONNECTED,
          l1: { network: l1Network, signer: web3Provider.getSigner(0) },
          l2: { network: l2Network, signer: l2Provider.getSigner(address!) },
          isConnectedToArbitrum: false
        })
      } else if (L2ChainIds.includes(networkId)) {
        let l2Network: L2Network

        if (L2NetworkCache[networkId]) {
          l2Network = L2NetworkCache[networkId]
        } else {
          l2Network = await getL2Network(web3Provider)
          L2NetworkCache[networkId] = l2Network
        }

        const l1NetworkChainId = l2Network.partnerChainID
        const l1Provider = new JsonRpcProvider(rpcURLs[l1NetworkChainId])

        let l1Network: L1Network

        if (L1NetworkCache[networkId]) {
          l1Network = L1NetworkCache[networkId]
        } else {
          l1Network = await getL1Network(l1Provider)
          L1NetworkCache[networkId] = l1Network
        }

        setResult({
          status: UseNetworksAndSignersStatus.CONNECTED,
          l1: { network: l1Network, signer: l1Provider.getSigner(address!) },
          l2: { network: l2Network, signer: web3Provider.getSigner(0) },
          isConnectedToArbitrum: false
        })
      } else {
        setResult({
          status: UseNetworksAndSignersStatus.NOT_SUPPORTED,
          ...defaults
        })
      }
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
