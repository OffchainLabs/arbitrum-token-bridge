import { useMemo } from 'react'
import { BigNumber, Signer } from 'ethers'
import useSWR from 'swr'
import { useAccount, useSigner } from 'wagmi'
import { getOftTransferConfig } from '../../token-bridge-sdk/oftUtils'
import { OftTransferStarter } from '../../token-bridge-sdk/OftTransferStarter'
import { getProviderForChainId } from '../../token-bridge-sdk/utils'
import { useNetworks } from '../useNetworks'

async function fetcher([
  signer,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  walletAddress
]: [
  signer: Signer,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  walletAddress: string | undefined
]) {
  // Assuming minimal dust amount for gas estimates
  const amount = BigNumber.from(1)

  const sourceChainProvider = getProviderForChainId(sourceChainId)
  const destinationChainProvider = getProviderForChainId(destinationChainId)

  const { estimatedSourceChainFee, estimatedDestinationChainFee } =
    await new OftTransferStarter({
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

export function useOftFeeEstimates({
  sourceChainErc20Address
}: {
  sourceChainErc20Address?: string
}) {
  const { data: signer } = useSigner()
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()

  const sourceChainId = networks.sourceChain.id
  const destinationChainId = networks.destinationChain.id

  const isValidOftTransfer = useMemo(() => {
    return !!getOftTransferConfig({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address
    }).isValid
  }, [sourceChainId, destinationChainId, sourceChainErc20Address])

  const { data: feeEstimates, error } = useSWR(
    signer && isValidOftTransfer
      ? ([
          sourceChainId,
          destinationChainId,
          sourceChainErc20Address,
          walletAddress,
          'oftFeeEstimates'
        ] as const)
      : null,
    ([
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _walletAddress
    ]) => {
      const sourceProvider = getProviderForChainId(_sourceChainId)
      const _signer = sourceProvider.getSigner(_walletAddress)

      return fetcher([
        _signer,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _walletAddress
      ])
    },
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000,
      fallbackData: {
        sourceChainGasFee: BigNumber.from(0),
        destinationChainGasFee: BigNumber.from(0)
      }
    }
  )

  return {
    feeEstimates,
    isLoading: !error && !feeEstimates,
    error
  }
}
