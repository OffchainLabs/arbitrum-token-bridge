import { BigNumber, Signer } from 'ethers'
import { useMemo } from 'react'
import useSWR from 'swr'
import { useSigner } from 'wagmi'
import { Provider } from '@ethersproject/providers'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { getProviderForChainId } from '../useNetworks'

async function fetcher([
  signer,
  sourceChainProvider,
  destinationChainProvider,
  sourceChainErc20Address,
  amount
]: [
  signer: Signer,
  sourceChainProvider: Provider,
  destinationChainProvider: Provider,
  sourceChainErc20Address: string | undefined,
  amount: BigNumber
]): Promise<GasEstimates | DepositGasEstimates | undefined> {
  const bridgeTransferStarter = await BridgeTransferStarterFactory.create({
    sourceChainProvider,
    destinationChainProvider,
    sourceChainErc20Address
  })

  return await bridgeTransferStarter.transferEstimateGas({
    amount,
    signer
  })
}

export function useGasEstimates({
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  amount
}: {
  walletAddress?: string
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
  amount: BigNumber
}): {
  gasEstimates: GasEstimates | DepositGasEstimates | undefined
  error: any
} {
  const { data: signer } = useSigner()

  const sourceChainProvider = useMemo(
    () => getProviderForChainId(sourceChainId),
    [sourceChainId]
  )
  const destinationChainProvider = useMemo(
    () => getProviderForChainId(destinationChainId),
    [destinationChainId]
  )

  const { data: gasEstimates, error } = useSWR(
    typeof signer === 'undefined'
      ? null
      : [
          walletAddress,
          sourceChainId,
          destinationChainId,
          sourceChainErc20Address,
          amount.toString(), // BigNumber is not serializable
          'gasEstimates'
        ],
    () => {
      if (typeof signer === 'undefined' || signer === null) {
        return undefined
      }

      return fetcher([
        signer,
        sourceChainProvider,
        destinationChainProvider,
        sourceChainErc20Address,
        amount
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
