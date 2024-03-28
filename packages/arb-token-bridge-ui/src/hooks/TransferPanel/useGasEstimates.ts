import { BigNumber } from 'ethers'
import { Provider } from '@ethersproject/providers'
import useSWR from 'swr'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { depositTokenEstimateGas } from '../../util/TokenDepositUtils'
import { withdrawInitTxEstimateGas } from '../../util/WithdrawalUtils'
import { Address } from '../../util/AddressUtils'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'

export enum TransferType {
  'deposit',
  'withdrawal'
}

async function fetcher([
  walletAddress,
  txType,
  parentChainProvider,
  childChainProvider,
  tokenParentChainAddress,
  amount
]: [
  walletAddress: Address,
  txType: TransferType,
  parentChainProvider: Provider | undefined,
  childChainProvider: Provider,
  tokenParentChainAddress: string | undefined,
  amount: BigNumber
]): Promise<GasEstimates | DepositGasEstimates> {
  const isDeposit =
    txType === TransferType.deposit &&
    typeof parentChainProvider !== 'undefined'

  const estimateGasFunctionParams = {
    amount,
    address: walletAddress,
    childChainProvider
  }

  if (isDeposit) {
    return typeof tokenParentChainAddress === 'string'
      ? await depositTokenEstimateGas({
          ...estimateGasFunctionParams,
          parentChainProvider,
          erc20L1Address: tokenParentChainAddress
        })
      : await depositEthEstimateGas({
          ...estimateGasFunctionParams,
          parentChainProvider
        })
  }

  return await withdrawInitTxEstimateGas({
    ...estimateGasFunctionParams,
    erc20L1Address: tokenParentChainAddress
  })
}

export function useGasEstimates({
  walletAddress,
  txType,
  parentChainProvider,
  childChainProvider,
  tokenParentChainAddress,
  amount
}: {
  walletAddress: Address | undefined
  txType: TransferType
  parentChainProvider?: Provider
  childChainProvider: Provider
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
          txType,
          parentChainProvider,
          childChainProvider,
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
