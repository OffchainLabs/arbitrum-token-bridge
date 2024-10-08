import { constants, utils } from 'ethers'
import { useMemo } from 'react'
import { useDebounce } from '@uidotdev/usehooks'

import { useAppState } from '../../state'
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
  const {
    app: { selectedToken: token }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)

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

  const balance = useBalanceOnSourceChain(token)

  const { gasEstimates: estimateGasResult, error: gasEstimatesError } =
    useGasEstimates({
      amount: amountBigNumber,
      sourceChainErc20Address: isDepositMode
        ? token?.address
        : isTokenArbitrumOneNativeUSDC(token?.address) ||
          isTokenArbitrumSepoliaNativeUSDC(token?.address)
        ? token?.address
        : token?.l2Address,
      destinationChainErc20Address: isDepositMode
        ? token?.l2Address
        : token?.address
    })

  const estimatedParentChainGasFees = useMemo(() => {
    if (!estimateGasResult?.estimatedParentChainGas) {
      return
    }
    return parseFloat(
      utils.formatEther(
        estimateGasResult.estimatedParentChainGas.mul(parentChainGasPrice)
      )
    )
  }, [estimateGasResult, parentChainGasPrice])

  const estimatedChildChainGasFees = useMemo(() => {
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
  }, [childChainGasPrice, estimateGasResult, isDepositMode])

  const gasSummary: UseGasSummaryResult = useMemo(() => {
    if (
      !isDepositMode &&
      (isTokenArbitrumOneNativeUSDC(token?.address) ||
        isTokenArbitrumSepoliaNativeUSDC(token?.address))
    ) {
      return {
        status: 'unavailable',
        estimatedParentChainGasFees: undefined,
        estimatedChildChainGasFees
      }
    }

    if (balance === null) {
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

    if (gasEstimatesError) {
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
    isDepositMode,
    token?.address,
    balance,
    amountBigNumber,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees,
    gasEstimatesError
  ])

  return gasSummary
}
