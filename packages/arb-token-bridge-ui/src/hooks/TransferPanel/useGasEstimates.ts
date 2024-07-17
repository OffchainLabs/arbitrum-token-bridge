import { BigNumber, constants } from 'ethers'
import useSWR from 'swr'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

async function fetcher([
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  amount
]: [
  walletAddress: string | undefined,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  amount: BigNumber
]): Promise<GasEstimates | DepositGasEstimates | undefined> {
  const _walletAddress = walletAddress ?? constants.AddressZero
  const sourceProvider = getProviderForChainId(sourceChainId)
  const signer = sourceProvider.getSigner(_walletAddress)
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
  amount
}: {
  walletAddress?: string
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  amount: BigNumber
}): {
  gasEstimates: GasEstimates | DepositGasEstimates | undefined
  error: any
} {
  const { data: gasEstimates, error } = useSWR(
    [
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address,
      destinationChainErc20Address,
      amount.toString(), // BigNumber is not serializable
      walletAddress,
      'gasEstimates'
    ],
    ([
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _destinationChainErc20Address,
      _amount,
      _walletAddress
    ]) =>
      fetcher([
        _walletAddress,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _destinationChainErc20Address,
        BigNumber.from(_amount)
      ]),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  if (typeof walletAddress === 'undefined') {
    return { gasEstimates, error: 'walletNotConnected' }
  }

  return { gasEstimates, error }
}
