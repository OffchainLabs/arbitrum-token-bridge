import { constants, utils } from 'ethers'
import { useAccount } from 'wagmi'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useNativeCurrency } from '../useNativeCurrency'
import { useGasEstimates } from './useGasEstimates'
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain'
import { DepositGasEstimates } from '../arbTokenBridge.types'
import { truncateExtraDecimals } from '../../util/NumberUtils'

const INITIAL_GAS_SUMMARY_RESULT: UseGasSummaryResult = {
  status: 'loading',
  estimatedParentChainGasFees: undefined,
  estimatedChildChainGasFees: undefined
}

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
  const { address: walletAddress } = useAccount()

  const [{ amount }] = useArbQueryParams()
  const debouncedAmount = useDebounce(amount, 300)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const [gasSummary, setGasSummary] = useState<UseGasSummaryResult>(
    INITIAL_GAS_SUMMARY_RESULT
  )

  const amountBigNumber = useMemo(() => {
    if (isNaN(Number(debouncedAmount))) {
      return constants.Zero
    }
    const amountSafe = debouncedAmount || '0'

    const decimals = token ? token.decimals : nativeCurrency.decimals

    const correctDecimalsAmount = truncateExtraDecimals(amountSafe, decimals)

    return utils.parseUnits(correctDecimalsAmount, decimals)
  }, [debouncedAmount, token, nativeCurrency])

  const parentChainGasPrice = useGasPrice({ provider: parentChainProvider })
  const childChainGasPrice = useGasPrice({ provider: childChainProvider })

  const setGasSummaryStatus = useCallback(
    (status: GasEstimationStatus) =>
      setGasSummary(previousGasSummary => ({
        ...previousGasSummary,
        status
      })),
    []
  )

  const { gasEstimates: estimateGasResult, error: gasEstimatesError } =
    useGasEstimates({
      walletAddress,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
      amount: amountBigNumber,
      tokenParentChainAddress: token ? token.address : undefined
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
    if (!estimateGasResult) {
      return
    }
    if (
      isDepositMode &&
      'estimatedChildChainSubmissionCost' in estimateGasResult
    ) {
      return parseFloat(
        utils.formatEther(
          estimateGasResult.estimatedChildChainGas
            .mul(childChainGasPrice)
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

  const balance = useBalanceOnSourceChain(token)

  useEffect(() => {
    if (
      !isDepositMode &&
      (isTokenArbitrumOneNativeUSDC(token?.address) ||
        isTokenArbitrumSepoliaNativeUSDC(token?.address))
    ) {
      setGasSummaryStatus('unavailable')
      return
    }

    if (!balance) {
      setGasSummaryStatus('loading')
      return
    }

    // If user has input an amount over their balance, don't estimate gas
    if (amountBigNumber.gt(balance)) {
      setGasSummaryStatus('insufficientBalance')
      return
    }

    if (
      typeof estimatedParentChainGasFees === 'undefined' ||
      typeof estimatedChildChainGasFees === 'undefined'
    ) {
      setGasSummaryStatus('loading')
      return
    }

    if (gasEstimatesError) {
      setGasSummaryStatus('error')
      return
    }

    setGasSummary({
      status: 'success',
      estimatedParentChainGasFees,
      estimatedChildChainGasFees
    })
  }, [
    walletAddress,
    balance,
    token,
    childChainProvider,
    setGasSummaryStatus,
    isDepositMode,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees,
    gasEstimatesError,
    amountBigNumber
  ])

  return gasSummary
}
