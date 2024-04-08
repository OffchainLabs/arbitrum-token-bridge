import { BigNumber } from 'ethers'
import useSWR from 'swr'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { depositTokenEstimateGas } from '../../util/TokenDepositUtils'
import { withdrawInitTxEstimateGas } from '../../util/WithdrawalUtils'
import { Address } from '../../util/AddressUtils'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { isDepositMode } from '../../util/isDepositMode'
import { getProviderForChainId } from '../useNetworks'

async function fetcher([
  walletAddress,
  sourceChainId,
  destinationChainId,
  tokenParentChainAddress,
  amount
]: [
  walletAddress: Address,
  sourceChainId: number,
  destinationChainId: number,
  tokenParentChainAddress: string | undefined,
  amount: string
]): Promise<GasEstimates | DepositGasEstimates> {
  const isDeposit = isDepositMode({ sourceChainId, destinationChainId })

  const sourceChainProvider = getProviderForChainId(sourceChainId)
  const destinationChainProvider = getProviderForChainId(destinationChainId)

  const estimateGasFunctionParams = {
    amount: BigNumber.from(amount),
    address: walletAddress,
    childChainProvider: isDeposit
      ? destinationChainProvider
      : sourceChainProvider
  }

  if (isDeposit) {
    return typeof tokenParentChainAddress === 'string'
      ? await depositTokenEstimateGas({
          ...estimateGasFunctionParams,
          parentChainProvider: sourceChainProvider,
          erc20L1Address: tokenParentChainAddress
        })
      : await depositEthEstimateGas({
          ...estimateGasFunctionParams,
          parentChainProvider: sourceChainProvider
        })
  }

  return await withdrawInitTxEstimateGas({
    ...estimateGasFunctionParams,
    erc20L1Address: tokenParentChainAddress
  })
}

export function useGasEstimates({
  walletAddress,
  sourceChainId,
  destinationChainId,
  tokenParentChainAddress,
  amount
}: {
  walletAddress: Address | undefined
  sourceChainId: number
  destinationChainId: number
  tokenParentChainAddress?: string
  amount: BigNumber
}): {
  gasEstimates: GasEstimates | DepositGasEstimates | undefined
  error: any
} {
  const { data: gasEstimates, error } = useSWR(
    typeof walletAddress === 'undefined'
      ? null
      : [
          walletAddress,
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
