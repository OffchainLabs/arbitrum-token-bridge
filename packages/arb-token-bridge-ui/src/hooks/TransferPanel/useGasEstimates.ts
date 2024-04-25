import { BigNumber, Signer } from 'ethers'
import useSWR from 'swr'
import { useSigner } from 'wagmi'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'

async function fetcher([
  signer,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  amount
]: [
  signer: Signer,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  amount: BigNumber
]): Promise<GasEstimates | DepositGasEstimates | undefined> {
  // use chainIds to initialize the bridgeTransferStarter to save RPC calls
  const bridgeTransferStarter = await BridgeTransferStarterFactory.create({
    sourceChainId,
    sourceChainErc20Address,
    destinationChainId,
    destinationChainErc20Address
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
  destinationChainErc20Address,
  amount
}: {
  walletAddress?: string
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  amount: BigNumber
}): {
  gasEstimates: GasEstimates | DepositGasEstimates | undefined
  error: any
} {
  const { data: signer } = useSigner()

  const { data: gasEstimates, error } = useSWR(
    typeof signer === 'undefined'
      ? null
      : [
          walletAddress,
          sourceChainId,
          destinationChainId,
          sourceChainErc20Address,
          destinationChainErc20Address,
          amount.toString(), // BigNumber is not serializable
          'gasEstimates'
        ],
    () => {
      if (typeof signer === 'undefined' || signer === null) {
        return undefined
      }

      return fetcher([
        signer,
        sourceChainId,
        destinationChainId,
        sourceChainErc20Address,
        destinationChainErc20Address,
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
