import { BigNumber, Signer, utils } from 'ethers'
import useSWR from 'swr'
import { useAccount, useSigner } from 'wagmi'

import { DepositGasEstimates, GasEstimates } from '../arbTokenBridge.types'
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain'
import { useNetworks } from '../useNetworks'
import { useSelectedToken } from '../useSelectedToken'
import { useArbQueryParams } from '../useArbQueryParams'
import { useIsSelectedTokenEther } from '../useIsSelectedTokenEther'
import { nativeCurrencyEther } from '../useNativeCurrency'

async function fetcher([
  signer,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  destinationAddress,
  amount
]: [
  signer: Signer,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  destinationAddress: string | undefined,
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
    signer,
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
  gasEstimates: GasEstimates | DepositGasEstimates | undefined
  error: any
} {
  const [{ sourceChain, destinationChain }] = useNetworks()
  const [selectedToken] = useSelectedToken()
  const isSelectedTokenEther = useIsSelectedTokenEther()
  const [{ destinationAddress }] = useArbQueryParams()
  const { address: walletAddress } = useAccount()
  const balance = useBalanceOnSourceChain(
    isSelectedTokenEther ? nativeCurrencyEther : selectedToken
  )
  const { data: signer } = useSigner()

  const amountToTransfer =
    balance !== null && amount.gte(balance) ? balance : amount

  const sanitizedDestinationAddress = utils.isAddress(
    String(destinationAddress)
  )
    ? destinationAddress
    : undefined

  const { data: gasEstimates, error } = useSWR(
    signer
      ? ([
          sourceChain.id,
          destinationChain.id,
          sourceChainErc20Address,
          destinationChainErc20Address,
          amountToTransfer.toString(), // BigNumber is not serializable
          sanitizedDestinationAddress,
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
      _destinationAddress,
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
        _destinationAddress,
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
