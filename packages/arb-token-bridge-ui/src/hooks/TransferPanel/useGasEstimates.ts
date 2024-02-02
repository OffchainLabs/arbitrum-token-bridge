import { useMemo } from 'react'
import { BigNumber } from 'ethers'
import { Provider } from '@ethersproject/providers'
import useSWR from 'swr'

import { estimateTransferTxGas } from '../../util/EstimateGasUtils'
import { GasEstimates } from '../arbTokenBridge.types'

export function useGasEstimates({
  txType,
  childChainProvider,
  parentChainProvider,
  sourceChainId,
  destinationChainId,
  tokenParentChainAddress,
  walletAddress,
  amount
}: {
  txType: 'deposit' | 'withdrawal'
  childChainProvider: Provider
  parentChainProvider?: Provider
  sourceChainId: number
  destinationChainId: number
  tokenParentChainAddress?: string
  walletAddress: `0x${string}` | undefined
  amount: BigNumber
}): GasEstimates | undefined {
  const queryKey = useMemo(() => {
    if (typeof walletAddress === 'undefined') {
      // Don't fetch
      return null
    }
    return [
      walletAddress,
      txType,
      sourceChainId,
      destinationChainId,
      tokenParentChainAddress,
      amount
    ]
  }, [
    walletAddress,
    txType,
    sourceChainId,
    destinationChainId,
    tokenParentChainAddress,
    amount
  ])

  const { data: gasEstimate } = useSWR(
    queryKey,
    ([_walletAddress, _txType]) =>
      estimateTransferTxGas({
        amount,
        address: _walletAddress as `0x${string}`,
        childChainProvider,
        parentChainProvider:
          _txType === 'deposit' ? parentChainProvider : undefined,
        erc20L1Address: tokenParentChainAddress
      }),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  return gasEstimate
}
