import { useMemo } from 'react'
import { BigNumber, constants, Signer } from 'ethers'
import useSWR from 'swr'
import { useAccount, useSigner } from 'wagmi'

import { getOftV2TransferConfig } from '../../token-bridge-sdk/oftUtils'
import { OftV2TransferStarter } from '../../token-bridge-sdk/OftV2TransferStarter'
import { getProviderForChainId } from '../../token-bridge-sdk/utils'
import { useNetworks } from '../useNetworks'

async function fetcher([
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  isValidOftTransfer
]: [
  walletAddress: string | undefined,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
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

  const _walletAddress = walletAddress ?? constants.AddressZero
  const sourceChainProvider = getProviderForChainId(sourceChainId)
  const destinationChainProvider = getProviderForChainId(destinationChainId)
  const signer = sourceChainProvider.getSigner(_walletAddress)

  const { estimatedSourceChainFee, estimatedDestinationChainFee } =
    await new OftV2TransferStarter({
      sourceChainProvider,
      destinationChainProvider,
      sourceChainErc20Address
    }).transferEstimateFee({
      amount,
      signer
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
  const { address: walletAddress } = useAccount()
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
       ([
          sourceChainId,
          destinationChainId,
          sourceChainErc20Address,
          walletAddress,
          isValidOftTransfer,
          'oftFeeEstimates'
        ] as const),
    ([
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _walletAddress,
      _isValidOftTransfer
    ]) => {
      return fetcher([
        _walletAddress,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
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

  if (typeof walletAddress === 'undefined') {
    return { 
      feeEstimates, 
      isLoading: !error && !feeEstimates, 
      error: 'walletNotConnected'
    }
  }

  return {
    feeEstimates,
    isLoading: !error && !feeEstimates,
    error: !!error
  }
}
