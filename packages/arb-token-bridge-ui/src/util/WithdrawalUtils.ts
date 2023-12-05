import { Erc20Bridger, EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import * as Sentry from '@sentry/react'

import { GasEstimates } from '../hooks/arbTokenBridge.types'

export async function withdrawInitTxEstimateGas({
  amount,
  address,
  l2Provider,
  erc20L1Address
}: {
  amount: BigNumber
  address: `0x${string}`
  l2Provider: Provider
  erc20L1Address?: string
}): Promise<GasEstimates> {
  const isToken = typeof erc20L1Address === 'string'
  const bridger = await (isToken ? Erc20Bridger : EthBridger).fromProvider(
    l2Provider
  )

  const withdrawalRequest = isToken
    ? await (bridger as Erc20Bridger).getWithdrawalRequest({
        amount,
        destinationAddress: address,
        from: address,
        erc20l1Address: erc20L1Address
      })
    : await (bridger as EthBridger).getWithdrawalRequest({
        amount,
        destinationAddress: address,
        from: address
      })

  // For the withdrawal init tx, there's no gas fee paid on L1 separately
  // unless we break down part of the L2 gas fee into L2 tx fee + L1 batch posting fee for that tx
  // but as that does not fit into the context of the transfer. and
  // would lead to user confusion, we instead present all the gas fee as L2 gas fee
  const estimatedL1Gas = BigNumber.from(0)

  try {
    // add 30% to the estimated total gas as buffer
    const estimatedL2Gas = BigNumber.from(
      Math.ceil(
        Number(await l2Provider.estimateGas(withdrawalRequest.txRequest)) * 1.3
      )
    )

    return { estimatedL1Gas, estimatedL2Gas }
  } catch (error) {
    Sentry.captureException(error)

    return {
      estimatedL1Gas,
      // L2 gas estimation from recent txs
      estimatedL2Gas: BigNumber.from(4_300_000)
    }
  }
}
