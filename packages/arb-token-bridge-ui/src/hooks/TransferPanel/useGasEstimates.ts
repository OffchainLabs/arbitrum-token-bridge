import { BigNumber } from 'ethers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import useSWR from 'swr'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { depositTokenEstimateGas } from '../../util/TokenDepositUtils'
import { withdrawInitTxEstimateGas } from '../../util/WithdrawalUtils'
import { Address } from '../../util/AddressUtils'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { isDepositMode } from '../../util/isDepositMode'

async function fetcher([
  walletAddress,
  sourceChainProvider,
  destinationChainProvider,
  tokenParentChainAddress,
  amount
]: [
  walletAddress: Address,
  sourceChainProvider: StaticJsonRpcProvider,
  destinationChainProvider: StaticJsonRpcProvider,
  tokenParentChainAddress: string | undefined,
  amount: BigNumber
]): Promise<GasEstimates | DepositGasEstimates> {
  const sourceChainId = (await sourceChainProvider.getNetwork()).chainId
  const destinationChainId = (await destinationChainProvider.getNetwork())
    .chainId
  const isDeposit = isDepositMode({ sourceChainId, destinationChainId })

  const estimateGasFunctionParams = {
    amount,
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
  sourceChainProvider,
  destinationChainProvider,
  tokenParentChainAddress,
  amount
}: {
  walletAddress: Address | undefined
  sourceChainProvider: StaticJsonRpcProvider
  destinationChainProvider: StaticJsonRpcProvider
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
          sourceChainProvider,
          destinationChainProvider,
          tokenParentChainAddress,
          amount,
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
