import { constants, utils } from 'ethers'
import { useMemo } from 'react'
import { useDebounce } from '@uidotdev/usehooks'

import { useGasPrice } from '../useGasPrice'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC
} from '../../util/TokenUtils'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { useNetworks } from '../useNetworks'
import { useArbQueryParams } from '../useArbQueryParams'
import { useGasEstimates } from './useGasEstimates'
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain'
import { DepositGasEstimates } from '../arbTokenBridge.types'
import { truncateExtraDecimals } from '../../util/NumberUtils'
import { useSelectedTokenDecimals } from './useSelectedTokenDecimals'
import { percentIncrease } from '@/token-bridge-sdk/utils'
import { DEFAULT_GAS_PRICE_PERCENT_INCREASE } from '@/token-bridge-sdk/Erc20DepositStarter'
import { getTransferMode } from '../../util/getTransferMode'
import { useSelectedToken } from '../useSelectedToken'
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

export function useGasSummary(): UseGasSummaryResult {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider } =
    useNetworksRelationship(networks)
  const transferMode = getTransferMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })

  const [{ amount }] = useArbQueryParams()
  const debouncedAmount = useDebounce(amount, 300)
  const decimals = useSelectedTokenDecimals()

  const amountBigNumber = useMemo(() => {
    if (isNaN(Number(debouncedAmount))) {
      return constants.Zero
    }
    const amountSafe = debouncedAmount || '0'

    const correctDecimalsAmount = truncateExtraDecimals(amountSafe, decimals)

    return utils.parseUnits(correctDecimalsAmount, decimals)
  }, [debouncedAmount, decimals])

  const parentChainGasPrice = useGasPrice({ provider: parentChainProvider })
  const childChainGasPrice = useGasPrice({ provider: childChainProvider })

  const balance = useBalanceOnSourceChain(selectedToken)

  const { gasEstimates: estimateGasResult, error: gasEstimatesError } =
    useGasEstimates({
      amount: amountBigNumber,
      sourceChainErc20Address:
        transferMode === 'deposit' || transferMode === 'teleport'
          ? selectedToken?.address
          : isTokenArbitrumOneNativeUSDC(selectedToken?.address) ||
            isTokenArbitrumSepoliaNativeUSDC(selectedToken?.address)
          ? selectedToken?.address
          : selectedToken?.l2Address,
      destinationChainErc20Address:
        transferMode === 'deposit' || transferMode === 'teleport'
          ? selectedToken?.l2Address
          : selectedToken?.address
    })

  const isOft = useIsOftV2Transfer()
  const {
    feeEstimates: oftFeeEstimates,
    error: oftFeeEstimatesError,
    isLoading: oftFeeSummaryLoading
  } = useOftV2FeeEstimates({
    sourceChainErc20Address:
      transferMode === 'deposit' || transferMode === 'teleport'
        ? selectedToken?.address
        : selectedToken?.l2Address
  })

  const estimatedParentChainGasFees = useMemo(() => {
    if (isOft && oftFeeEstimates) {
      return parseFloat(
        utils.formatEther(
          transferMode === 'deposit' || transferMode === 'teleport'
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
    transferMode
  ])

  const estimatedChildChainGasFees = useMemo(() => {
    if (isOft && oftFeeEstimates) {
      return parseFloat(
        utils.formatEther(
          transferMode === 'deposit' || transferMode === 'teleport'
            ? oftFeeEstimates.destinationChainGasFee
            : oftFeeEstimates.sourceChainGasFee
        )
      )
    }

    if (!estimateGasResult?.estimatedChildChainGas) {
      return
    }
    if (
      (transferMode === 'deposit' || transferMode === 'teleport') &&
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
    transferMode,
    oftFeeEstimates,
    isOft
  ])

  const gasSummary: UseGasSummaryResult = useMemo(() => {
    if (transferMode === 'unsupported') {
      return {
        status: 'error',
        estimatedParentChainGasFees,
        estimatedChildChainGasFees
      }
    }

    if (
      transferMode === 'withdrawal' &&
      (isTokenArbitrumOneNativeUSDC(selectedToken?.address) ||
        isTokenArbitrumSepoliaNativeUSDC(selectedToken?.address))
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

    if (gasEstimatesError || oftFeeEstimatesError) {
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
  }, [
    transferMode,
    selectedToken?.address,
    balance,
    amountBigNumber,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees,
    gasEstimatesError,
    oftFeeEstimatesError,
    oftFeeSummaryLoading
  ])

  return gasSummary
}
