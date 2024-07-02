import { BigNumber, Signer } from 'ethers'
import useSWR from 'swr'
import { useWalletClient } from 'wagmi'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

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
  const bridgeTransferStarter = BridgeTransferStarterFactory.create({
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
  amount,
  sourceChainBalance
}: {
  walletAddress?: string
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  amount: BigNumber
  sourceChainBalance: BigNumber | null
}): {
  gasEstimates: GasEstimates | DepositGasEstimates | undefined
  error: any
} {
  const { data: signer } = useWalletClient()

  const { data: gasEstimates, error } = useSWR(
    signer && sourceChainBalance && sourceChainBalance.gte(amount)
      ? ([
          sourceChainId,
          destinationChainId,
          sourceChainErc20Address,
          destinationChainErc20Address,
          amount.toString(), // BigNumber is not serializable
          walletAddress,
          'gasEstimates'
        ] as const)
      : null,
    ([
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _destinationChainErc20Address,
      _amount,
      _walletAddress
    ]) => {
      const sourceProvider = getProviderForChainId(_sourceChainId)
      const _signer = sourceProvider.getSigner(_walletAddress)

      return fetcher([
        _signer,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _destinationChainErc20Address,
        BigNumber.from(_amount)
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
