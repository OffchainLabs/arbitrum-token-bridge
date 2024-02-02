import { constants, utils } from 'ethers'
import { useAccount } from 'wagmi'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
import {
  calculateEstimatedChildChainGasFees,
  calculateEstimatedParentChainGasFees
} from '../../components/TransferPanel/TransferPanelMainUtils'
import { useGasEstimates } from './useGasEstimates'

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
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const [gasSummary, setGasSummary] = useState<UseGasSummaryResult>(
    INITIAL_GAS_SUMMARY_RESULT
  )

  const amountBigNumber = useMemo(() => {
    try {
      const amountSafe = amount || '0'
      const decimals = token ? token.decimals : nativeCurrency.decimals

      return utils.parseUnits(amountSafe, decimals)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, token, nativeCurrency])

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

  const estimateGasResult = useGasEstimates({
    txType: isDepositMode ? 'deposit' : 'withdrawal',
    walletAddress,
    childChainProvider,
    parentChainProvider: isDepositMode ? parentChainProvider : undefined,
    amount: amountBigNumber,
    tokenParentChainAddress: token ? token.address : undefined,
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })

  const estimatedParentChainGasFees = useMemo(() => {
    if (!estimateGasResult) {
      setGasSummaryStatus('loading')
      return
    }
    return calculateEstimatedParentChainGasFees(
      estimateGasResult.estimatedParentChainGas,
      parentChainGasPrice
    )
  }, [estimateGasResult, parentChainGasPrice, setGasSummaryStatus])

  const estimatedChildChainGasFees = useMemo(() => {
    if (!estimateGasResult) {
      setGasSummaryStatus('loading')
      return
    }
    return calculateEstimatedChildChainGasFees(
      estimateGasResult.estimatedChildChainGas,
      childChainGasPrice,
      estimateGasResult.estimatedChildChainSubmissionCost
    )
  }, [childChainGasPrice, estimateGasResult, setGasSummaryStatus])

  useEffect(() => {
    if (
      !isDepositMode &&
      (isTokenArbitrumOneNativeUSDC(token?.address) ||
        isTokenArbitrumSepoliaNativeUSDC(token?.address))
    ) {
      setGasSummaryStatus('unavailable')
      return
    }
    setGasSummaryStatus('loading')

    if (typeof estimateGasResult === 'undefined') {
      setGasSummaryStatus('error')
      return
    }

    setGasSummary({
      status: 'success',
      estimatedParentChainGasFees,
      estimatedChildChainGasFees
    })
  }, [
    // Re-run gas estimation when:
    isDepositMode, // when user switches deposit/withdraw mode
    amountBigNumber,
    token, // when the token changes
    setGasSummaryStatus,
    childChainGasPrice,
    parentChainGasPrice,
    estimateGasResult,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  ])

  return gasSummary
}
