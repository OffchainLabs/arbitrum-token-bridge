import { BigNumber } from 'ethers'
import { Provider } from '@ethersproject/providers'
import useSWR from 'swr'

import { GasEstimates } from '../arbTokenBridge.types'
import { depositTokenEstimateGas } from '../../util/TokenDepositUtils'
import { withdrawInitTxEstimateGas } from '../../util/WithdrawalUtils'
import { Address } from '../../util/AddressUtils'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'

type TransferType = 'deposit' | 'withdrawal'

async function fetcher([
  _walletAddress,
  _txType,
  _parentChainProvider,
  _childChainProvider,
  _tokenParentChainAddress,
  _amount
]: [
  _walletAddress: Address,
  _txType: TransferType,
  _parentChainProvider: Provider | undefined,
  _childChainProvider: Provider,
  _tokenParentChainAddress: string | undefined,
  _amount: BigNumber
]): Promise<GasEstimates> {
  const isDeposit =
    _txType === 'deposit' && typeof _parentChainProvider !== 'undefined'

  const estimateGasFunctionParams = {
    amount: _amount,
    address: _walletAddress,
    childChainProvider: _childChainProvider
  }

  if (isDeposit) {
    return typeof _tokenParentChainAddress === 'string'
      ? await depositTokenEstimateGas({
          ...estimateGasFunctionParams,
          parentChainProvider: _parentChainProvider,
          erc20L1Address: _tokenParentChainAddress
        })
      : await depositEthEstimateGas({
          ...estimateGasFunctionParams,
          parentChainProvider: _parentChainProvider
        })
  }

  return await withdrawInitTxEstimateGas({
    ...estimateGasFunctionParams,
    erc20L1Address: _tokenParentChainAddress
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
}): { gasEstimates: GasEstimates | undefined; error: any } {
  const { data: gasEstimates, error } = useSWR(
    typeof walletAddress === 'undefined'
      ? null
      : [
          walletAddress,
          txType,
          parentChainProvider,
          childChainProvider,
          tokenParentChainAddress,
          amount
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
