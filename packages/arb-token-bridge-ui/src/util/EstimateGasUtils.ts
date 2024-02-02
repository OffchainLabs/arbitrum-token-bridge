import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'

import { depositTxEstimateGas } from './TokenDepositUtils'
import { withdrawInitTxEstimateGas } from './WithdrawalUtils'

export async function estimateTransferTxGas({
  parentChainProvider,
  ...estimateGasFunctionParams
}: {
  amount: BigNumber
  address: `0x${string}`
  childChainProvider: Provider
  parentChainProvider?: Provider
  erc20L1Address?: string
}) {
  const isDeposit = typeof parentChainProvider !== 'undefined'

  if (isDeposit) {
    return await depositTxEstimateGas({
      ...estimateGasFunctionParams,
      parentChainProvider
    })
  }

  return await withdrawInitTxEstimateGas(estimateGasFunctionParams)
}
