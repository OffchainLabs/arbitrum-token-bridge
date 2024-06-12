import { BigNumber, Signer } from 'ethers'
import useSWR from 'swr'
import { useSigner } from 'wagmi'
import * as Sentry from '@sentry/react'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'

async function fetcher([
  signer,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  amount,
  balance
]: [
  signer: Signer,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  amount: BigNumber,
  balance: BigNumber
]): Promise<GasEstimates | DepositGasEstimates | undefined> {
  // use chainIds to initialize the bridgeTransferStarter to save RPC calls
  const bridgeTransferStarter = BridgeTransferStarterFactory.create({
    sourceChainId,
    sourceChainErc20Address,
    destinationChainId,
    destinationChainErc20Address
  })

  return await bridgeTransferStarter.transferEstimateGas({
    amount,
    signer,
    onError(error) {
      const code = (error as { code: string }).code
      if (
        code === 'INSUFFICIENT_FUNDS' ||
        (code === 'UNPREDICTABLE_GAS_LIMIT' && amount.gte(balance))
      ) {
        // If amount is equal or above balance's user, we should not have run the gas estimate
        Sentry.captureException(error)
      }
    }
  })
}

export function useGasEstimates({
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  amount,
  balance
}: {
  walletAddress?: string
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  amount: BigNumber
  balance: BigNumber | null
}): {
  gasEstimates: GasEstimates | DepositGasEstimates | undefined
  error: any
} {
  const { data: signer } = useSigner()

  const { data: gasEstimates, error } = useSWR(
    signer && balance && balance.gt(amount)
      ? ([
          signer,
          sourceChainId,
          destinationChainId,
          sourceChainErc20Address,
          destinationChainErc20Address,
          amount.toString(), // BigNumber is not serializable
          balance?.toString(),
          walletAddress,
          'gasEstimates'
        ] as const)
      : null,
    ([
      _signer,
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _destinationChainErc20Address,
      _amount,
      _balance
    ]) => {
      return fetcher([
        _signer,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _destinationChainErc20Address,
        BigNumber.from(_amount),
        BigNumber.from(_balance)
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
