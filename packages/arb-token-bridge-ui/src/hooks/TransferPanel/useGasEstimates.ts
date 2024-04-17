import { BigNumber, Signer } from 'ethers'
import useSWR from 'swr'
import { useSigner } from 'wagmi'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { getProviderForChainId } from '../useNetworks'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'

async function fetcher([
  signer,
  sourceChainId,
  destinationChainId,
  tokenParentChainAddress,
  amount
]: [
  signer: Signer,
  sourceChainId: number,
  destinationChainId: number,
  tokenParentChainAddress: string | undefined,
  amount: string
]): Promise<GasEstimates | DepositGasEstimates | undefined> {
  const sourceChainProvider = getProviderForChainId(sourceChainId)
  const destinationChainProvider = getProviderForChainId(destinationChainId)

  const bridgeTransferStarter = await BridgeTransferStarterFactory.create({
    sourceChainProvider,
    destinationChainProvider,
    sourceChainErc20Address: tokenParentChainAddress
  })

  return await bridgeTransferStarter.transferEstimateGas({
    amount: BigNumber.from(amount),
    signer
  })
}

export function useGasEstimates({
  sourceChainId,
  destinationChainId,
  tokenParentChainAddress,
  amount
}: {
  sourceChainId: number
  destinationChainId: number
  tokenParentChainAddress?: string
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
          signer,
          sourceChainId,
          destinationChainId,
          tokenParentChainAddress,
          amount.toString(), // BigNumber is not serializable
          'gasEstimates'
        ],
    fetcher,
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  return { gasEstimates, error }
}
