import { BigNumber, utils } from 'ethers'
import { useMemo } from 'react'

import { useGasPrice } from '../useGasPrice'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC
} from '../../util/TokenUtils'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { useNetworks } from '../useNetworks'
import { useGasEstimates } from './useGasEstimates'
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain'
import { DepositGasEstimates } from '../arbTokenBridge.types'
import { percentIncrease } from '@/token-bridge-sdk/utils'
import { DEFAULT_GAS_PRICE_PERCENT_INCREASE } from '@/token-bridge-sdk/Erc20DepositStarter'
import { useSelectedToken } from '../useSelectedToken'
import { useAmountBigNumber } from '../../components/TransferPanel/hooks/useAmountBigNumber'
import { useIsOftV2Transfer } from '../../components/TransferPanel/hooks/useIsOftV2Transfer'
import { useOftV2FeeEstimates } from './useOftV2FeeEstimates'

export type GasEstimationStatus =
  | 'loading'
  | 'success'
  | 'error'
  | 'unavailable'
  | 'insufficientBalance'

export type UseGasSummaryResult = {
  status: GasEstimationStatus
  estimatedParentChainGasFees: number | undefined
  estimatedChildChainGasFees: number | undefined
}

export function getGasSummary({
  selectedTokenAddress,
  amountBigNumber,
  balance,
  isDepositMode,
  estimatedParentChainGasFees,
  estimatedChildChainGasFees,
  gasEstimatesError,
  oftFeeEstimatesError,
  oftFeeSummaryLoading
}: {
  selectedTokenAddress: string | undefined
  amountBigNumber: BigNumber
  balance: BigNumber | null
  isDepositMode: boolean
  estimatedParentChainGasFees: number | undefined
  estimatedChildChainGasFees: number | undefined
  gasEstimatesError: any
  oftFeeEstimatesError: boolean
  oftFeeSummaryLoading: boolean
}): UseGasSummaryResult {
  if (
    !isDepositMode &&
    (isTokenArbitrumOneNativeUSDC(selectedTokenAddress) ||
      isTokenArbitrumSepoliaNativeUSDC(selectedTokenAddress))
  ) {
    return {
      status: 'unavailable',
      estimatedParentChainGasFees: undefined,
      estimatedChildChainGasFees
    }
  }

  if (balance === null || oftFeeSummaryLoading) {
    return {
      status: 'loading',
      estimatedParentChainGasFees,
      estimatedChildChainGasFees
    }
  }

  if (amountBigNumber.gt(balance)) {
    return {
      status: 'insufficientBalance',
      estimatedParentChainGasFees,
      estimatedChildChainGasFees
    }
  }

  if (
    (gasEstimatesError && gasEstimatesError !== 'walletNotConnected') ||
    oftFeeEstimatesError
  ) {
    return {
      status: 'error',
      estimatedParentChainGasFees,
      estimatedChildChainGasFees
    }
  }

  return {
    status: 'success',
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  }
}

export function useGasSummary(): UseGasSummaryResult {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)

  const amountBigNumber = useAmountBigNumber()

  const parentChainGasPrice = useGasPrice({ provider: parentChainProvider })
  const childChainGasPrice = useGasPrice({ provider: childChainProvider })

  const balance = useBalanceOnSourceChain(selectedToken)

  const { gasEstimates: estimateGasResult, error: gasEstimatesError } =
    useGasEstimates({
      amount: amountBigNumber,
      sourceChainErc20Address: isDepositMode
        ? selectedToken?.address
        : isTokenArbitrumOneNativeUSDC(selectedToken?.address) ||
          isTokenArbitrumSepoliaNativeUSDC(selectedToken?.address)
        ? selectedToken?.address
        : selectedToken?.l2Address,
      destinationChainErc20Address: isDepositMode
        ? selectedToken?.l2Address
        : selectedToken?.address
    })

  const isOft = useIsOftV2Transfer()
  const {
    feeEstimates: oftFeeEstimates,
    error: oftFeeEstimatesError,
    isLoading: oftFeeSummaryLoading
  } = useOftV2FeeEstimates({
    sourceChainErc20Address: isDepositMode
      ? selectedToken?.address
      : selectedToken?.l2Address
  })

  const estimatedParentChainGasFees = useMemo(() => {
    if (isOft && oftFeeEstimates) {
      return parseFloat(
        utils.formatEther(
          isDepositMode
            ? oftFeeEstimates.sourceChainGasFee
            : oftFeeEstimates.destinationChainGasFee
        )
      )
    }

    if (!estimateGasResult?.estimatedParentChainGas) {
      return
    }
    return parseFloat(
      utils.formatEther(
        estimateGasResult.estimatedParentChainGas.mul(parentChainGasPrice)
      )
    )
  }, [
    estimateGasResult,
    parentChainGasPrice,
    isOft,
    oftFeeEstimates,
    isDepositMode
  ])

  const estimatedChildChainGasFees = useMemo(() => {
    if (isOft && oftFeeEstimates) {
      return parseFloat(
        utils.formatEther(
          isDepositMode
            ? oftFeeEstimates.destinationChainGasFee
            : oftFeeEstimates.sourceChainGasFee
        )
      )
    }

    if (!estimateGasResult?.estimatedChildChainGas) {
      return
    }
    if (
      isDepositMode &&
      'estimatedChildChainSubmissionCost' in estimateGasResult
    ) {
      return parseFloat(
        utils.formatEther(
          estimateGasResult.estimatedChildChainGas
            .mul(
              percentIncrease(
                childChainGasPrice,
                DEFAULT_GAS_PRICE_PERCENT_INCREASE
              )
            )
            .add(
              (estimateGasResult as DepositGasEstimates)
                .estimatedChildChainSubmissionCost
            )
        )
      )
    }
    return parseFloat(
      utils.formatEther(
        estimateGasResult.estimatedChildChainGas.mul(childChainGasPrice)
      )
    )
  }, [
    childChainGasPrice,
    estimateGasResult,
    isDepositMode,
    oftFeeEstimates,
    isOft
  ])

  const gasSummary = useMemo(
    () =>
      getGasSummary({
        selectedTokenAddress: selectedToken?.address,
        amountBigNumber,
        balance,
        isDepositMode,
        estimatedParentChainGasFees,
        estimatedChildChainGasFees,
        gasEstimatesError,
        oftFeeEstimatesError,
        oftFeeSummaryLoading
      }),
    [
      selectedToken,
      amountBigNumber,
      balance,
      isDepositMode,
      estimatedParentChainGasFees,
      estimatedChildChainGasFees,
      gasEstimatesError,
      oftFeeEstimatesError,
      oftFeeSummaryLoading
    ]
  )

  return gasSummary
}
