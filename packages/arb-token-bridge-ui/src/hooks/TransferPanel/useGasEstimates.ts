import { BigNumber, constants, utils } from 'ethers'
import useSWR from 'swr'
import { useAccount } from 'wagmi'

import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain'
import { useNetworks } from '../useNetworks'
import { useSelectedToken } from '../useSelectedToken'
import { useArbQueryParams } from '../useArbQueryParams'
import { TransferEstimateGasResult } from '@/token-bridge-sdk/BridgeTransferStarter'

async function fetcher([
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  destinationAddress,
  amount
]: [
  walletAddress: string | undefined,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  destinationAddress: string | undefined,
  amount: BigNumber
]): Promise<TransferEstimateGasResult> {
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
    from: await signer.getAddress(),
    destinationAddress
  })
}

export function useGasEstimates({
  sourceChainErc20Address,
  destinationChainErc20Address,
  amount
}: {
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  amount: BigNumber
}): {
  gasEstimates: TransferEstimateGasResult
  error: any
} {
  const [{ sourceChain, destinationChain }] = useNetworks()
  const [selectedToken] = useSelectedToken()
  const [{ destinationAddress }] = useArbQueryParams()
  const { address: walletAddress } = useAccount()
  const balance = useBalanceOnSourceChain(selectedToken)

  const amountToTransfer =
    balance !== null && amount.gte(balance) ? balance : amount

  const sanitizedDestinationAddress = utils.isAddress(
    String(destinationAddress)
  )
    ? destinationAddress
    : undefined

  const { data: gasEstimates, error } = useSWR(
    [
      sourceChain.id,
      destinationChain.id,
      sourceChainErc20Address,
      destinationChainErc20Address,
      amountToTransfer.toString(), // BigNumber is not serializable
      sanitizedDestinationAddress,
      walletAddress,
      'gasEstimates'
    ] as const,
    ([
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _destinationChainErc20Address,
      _amount,
      _destinationAddress,
      _walletAddress
    ]) =>
      fetcher([
        _walletAddress,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _destinationChainErc20Address,
        _destinationAddress,
        BigNumber.from(_amount)
      ]),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  return { gasEstimates, error }
}
