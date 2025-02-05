import { BigNumber } from 'ethers'
import useSWR from 'swr'
import { type PublicClient, createPublicClient, http, getAddress, createWalletClient } from 'viem'
import { L2Network } from '@arbitrum/sdk'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { rpcURLs } from '../../util/networks'
import { getArbitrumNetwork } from '@arbitrum/sdk'

async function fetcher([
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  destinationAddress,
  amount
]: [
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  destinationAddress: string | undefined,
  amount: BigNumber
]): Promise<GasEstimates | DepositGasEstimates | undefined> {
  try {
    const l1PublicClient = createPublicClient({
      transport: http(rpcURLs[sourceChainId])
    })

    const l2PublicClient = createPublicClient({
      transport: http(rpcURLs[destinationChainId])
    })

    const arbitrumNetwork = await getArbitrumNetwork(destinationChainId)
    // Cast to L2Network since we know it has the required properties
    const l2Network = arbitrumNetwork as unknown as L2Network

    // Create a minimal wallet client for gas estimation
    const walletClient = createWalletClient({
      transport: http(rpcURLs[sourceChainId])
    })

    const bridgeTransferStarter = await BridgeTransferStarterFactory.create(
      {
        sourceChainId,
        sourceChainErc20Address: sourceChainErc20Address 
          ? getAddress(sourceChainErc20Address)
          : undefined,
        destinationChainId,
        destinationChainErc20Address: destinationChainErc20Address
          ? getAddress(destinationChainErc20Address)
          : undefined
      },
      {
        l1PublicClient,
        l2PublicClient,
        l2Network,
        walletClient
      }
    )

    return bridgeTransferStarter.transferEstimateGas({
      amount,
      destinationAddress: destinationAddress
        ? getAddress(destinationAddress)
        : undefined
    })
  } catch (error) {
    console.error('Gas estimation failed:', error)
    throw error
  }
}

export function useGasEstimates({
  sourceChainErc20Address,
  destinationChainErc20Address,
  amount,
  sourceChainClient,
  destinationChainClient
}: {
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  amount: BigNumber
  sourceChainClient: PublicClient
  destinationChainClient: PublicClient
}): {
  gasEstimates: GasEstimates | DepositGasEstimates | undefined
  error: Error | null
} {
  const { data: gasEstimates, error } = useSWR(
    sourceChainClient?.chain?.id && destinationChainClient?.chain?.id
      ? ([
          sourceChainClient.chain.id,
          destinationChainClient.chain.id,
          sourceChainErc20Address,
          destinationChainErc20Address,
          undefined, // destinationAddress
          amount.toString(), // BigNumber is not serializable
          'gasEstimates'
        ] as const)
      : null,
    ([
      sourceChainId,
      destinationChainId,
      _sourceChainErc20Address,
      _destinationChainErc20Address,
      _destinationAddress,
      _amount
    ]) => {
      return fetcher([
        sourceChainId,
        destinationChainId,
        _sourceChainErc20Address,
        _destinationChainErc20Address,
        _destinationAddress,
        BigNumber.from(_amount)
      ])
    },
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  return { gasEstimates, error }
}
