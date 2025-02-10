import { useMemo } from 'react'
import { BigNumber } from 'ethers'
import useSWR from 'swr'
import { useAccount } from 'wagmi'
import { getOftV2TransferConfig } from '../../token-bridge-sdk/oftUtils'
import { OftV2TransferStarter } from '../../token-bridge-sdk/OftV2TransferStarter'
import { getProviderForChainId } from '../../token-bridge-sdk/utils'
import { useNetworks } from '../useNetworks'

async function fetcher([
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  senderAddress,
  isValidOftTransfer
]: [
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  senderAddress: string,
  isValidOftTransfer: boolean
]) {
  if (!isValidOftTransfer) {
    return {
      sourceChainGasFee: BigNumber.from(0),
      destinationChainGasFee: BigNumber.from(0)
    }
  }

  // Assuming minimal dust amount for gas estimates
  const amount = BigNumber.from(1)

  const sourceChainProvider = getProviderForChainId(sourceChainId)
  const destinationChainProvider = getProviderForChainId(destinationChainId)

  const { estimatedSourceChainFee, estimatedDestinationChainFee } =
    await new OftV2TransferStarter({
      sourceChainProvider,
      destinationChainProvider,
      sourceChainErc20Address
    }).transferEstimateFee({
      amount,
      senderAddress
    })

  return {
    sourceChainGasFee: BigNumber.from(estimatedSourceChainFee),
    destinationChainGasFee: BigNumber.from(estimatedDestinationChainFee)
  }
}

export function useOftV2FeeEstimates({
  sourceChainErc20Address
}: {
  sourceChainErc20Address?: string
}) {
  const { address: senderAddress } = useAccount()
  const [networks] = useNetworks()

  const sourceChainId = networks.sourceChain.id
  const destinationChainId = networks.destinationChain.id

  const isValidOftTransfer = useMemo(() => {
    return getOftV2TransferConfig({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address
    }).isValid
  }, [sourceChainId, destinationChainId, sourceChainErc20Address])

  const { data: feeEstimates, error } = useSWR(
    senderAddress
      ? ([
          sourceChainId,
          destinationChainId,
          sourceChainErc20Address,
          senderAddress,
          isValidOftTransfer,
          'oftFeeEstimates'
        ] as const)
      : null,
    ([
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _senderAddress,
      _isValidOftTransfer
    ]) => {
      return fetcher([
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _senderAddress,
        _isValidOftTransfer
      ])
    },
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  return {
    feeEstimates,
    isLoading: !error && !feeEstimates,
    error: !!error
  }
}
