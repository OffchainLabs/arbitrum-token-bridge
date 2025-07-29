import { BigNumber, constants, utils } from 'ethers'
import useSWR from 'swr'
import { Config, useAccount, useConfig } from 'wagmi'

import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain'
import { useNetworks } from '../useNetworks'
import { useSelectedToken } from '../useSelectedToken'
import { useArbQueryParams } from '../useArbQueryParams'
import { TransferEstimateGasResult } from '@/token-bridge-sdk/BridgeTransferStarter'
import {
  RouteContext,
  useRouteStore
} from '../../components/TransferPanel/hooks/useRouteStore'

async function fetcher([
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  destinationAddress,
  amount,
  wagmiConfig,
  context
]: [
  walletAddress: string | undefined,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  destinationAddress: string | undefined,
  amount: BigNumber,
  wagmiConfig: Config,
  context: RouteContext | undefined
]): Promise<TransferEstimateGasResult> {
  const _walletAddress = walletAddress ?? constants.AddressZero
  const sourceProvider = getProviderForChainId(sourceChainId)
  const signer = sourceProvider.getSigner(_walletAddress)
  // use chainIds to initialize the bridgeTransferStarter to save RPC calls
  const bridgeTransferStarter = BridgeTransferStarterFactory.create({
    sourceChainId,
    sourceChainErc20Address,
    destinationChainId,
    destinationChainErc20Address,
    lifiData: context || {
      fee: {
        amount: BigNumber.from(0),
        amountUSD: '0',
        token: {
          address: constants.AddressZero,
          decimals: 0,
          symbol: 'ETH'
        }
      },
      gas: {
        amount: BigNumber.from(0),
        amountUSD: '0',
        token: {
          address: constants.AddressZero,
          decimals: 0,
          symbol: 'ETH'
        }
      },
      spenderAddress: constants.AddressZero,
      transactionRequest: undefined
    }
  })

  return await bridgeTransferStarter.transferEstimateGas({
    amount,
    from: await signer.getAddress(),
    destinationAddress,
    wagmiConfig
  })
}

export function useGasEstimates({
  sourceChainErc20Address,
  destinationChainErc20Address,
  amount,
  enabled = true
}: {
  sourceChainErc20Address?: string
  destinationChainErc20Address?: string
  amount: BigNumber
  enabled?: boolean
}): {
  gasEstimates: TransferEstimateGasResult
  error: any
} {
  const [{ sourceChain, destinationChain }] = useNetworks()
  const [selectedToken] = useSelectedToken()
  const [{ destinationAddress }] = useArbQueryParams()
  const { address: walletAddress } = useAccount()
  const balance = useBalanceOnSourceChain(selectedToken)
  const wagmiConfig = useConfig()
  const context = useRouteStore(state => state.context)

  const amountToTransfer =
    balance !== null && amount.gte(balance) ? balance : amount

  const sanitizedDestinationAddress = utils.isAddress(
    String(destinationAddress)
  )
    ? destinationAddress
    : undefined

  const { data: gasEstimates, error } = useSWR(
    enabled
      ? ([
          sourceChain.id,
          destinationChain.id,
          sourceChainErc20Address,
          destinationChainErc20Address,
          amountToTransfer.toString(), // BigNumber is not serializable
          sanitizedDestinationAddress,
          walletAddress,
          wagmiConfig,
          context,
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
      _walletAddress,
      _wagmiConfig,
      _context
    ]) =>
      fetcher([
        _walletAddress,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _destinationChainErc20Address,
        _destinationAddress,
        BigNumber.from(_amount),
        _wagmiConfig,
        _context
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
