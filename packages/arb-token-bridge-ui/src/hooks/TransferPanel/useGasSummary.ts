import { BigNumber, constants, utils } from 'ethers'
import { useAccount } from 'wagmi'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAppState } from '../../state'
import { useGasPrice } from '../useGasPrice'
import { useDebouncedValue } from '../useDebouncedValue'
import {
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenArbitrumOneNativeUSDC
} from '../../util/TokenUtils'
import { withdrawInitTxEstimateGas } from '../../util/WithdrawalUtils'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { depositTokenEstimateGas } from '../../util/TokenDepositUtils'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { useNetworks } from '../useNetworks'
import { useArbQueryParams } from '../useArbQueryParams'
import { useNativeCurrency } from '../useNativeCurrency'
import {
  calculateEstimatedChildChainGasFees,
  calculateEstimatedParentChainGasFees
} from '../../components/TransferPanel/TransferPanelMainUtils'

const INITIAL_GAS_ESTIMATION_RESULT: GasEstimationResult = {
  // Estimated Parent Chain gas, denominated in Wei, represented as a BigNumber
  estimatedParentChainGas: constants.Zero,
  // Estimated Child Chain gas, denominated in Wei, represented as a BigNumber
  estimatedChildChainGas: constants.Zero,
  // Estimated Child Chain submission cost is precalculated and includes gas price
  estimatedChildChainSubmissionCost: constants.Zero
}

const INITIAL_GAS_SUMMARY_RESULT: UseGasSummaryResult = {
  status: 'loading',
  estimatedParentChainGasFees: 0,
  estimatedChildChainGasFees: 0
}

export type GasEstimationStatus =
  | 'loading'
  | 'success'
  | 'error'
  | 'unavailable'

export type GasEstimationResult = {
  estimatedParentChainGas: BigNumber
  estimatedChildChainGas: BigNumber
  estimatedChildChainSubmissionCost: BigNumber
}

export type UseGasSummaryResult = {
  status: GasEstimationStatus
  estimatedParentChainGasFees: number
  estimatedChildChainGasFees: number
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

  // Debounce the amount, so we run gas estimation only after the user has stopped typing for a bit
  const amountDebounced = useDebouncedValue(amountBigNumber, 1_500)

  const setGasSummaryStatus = useCallback(
    (status: GasEstimationStatus) =>
      setGasSummary(previousGasSummary => ({
        ...previousGasSummary,
        status
      })),
    []
  )

  const estimateGas = useCallback(async () => {
    if (!walletAddress) {
      return
    }

    const estimateGasFunctionParams = {
      amount: amountDebounced,
      address: walletAddress,
      l2Provider: childChainProvider
    }

    let estimateGasResult: GasEstimationResult = INITIAL_GAS_ESTIMATION_RESULT

    try {
      setGasSummaryStatus('loading')

      if (isDepositMode) {
        estimateGasResult = token
          ? await depositTokenEstimateGas({
              ...estimateGasFunctionParams,
              l1Provider: parentChainProvider,
              erc20L1Address: token.address
            })
          : await depositEthEstimateGas({
              ...estimateGasFunctionParams,
              l1Provider: parentChainProvider
            })
      } else {
        const partialEstimateGasResult = await withdrawInitTxEstimateGas({
          ...estimateGasFunctionParams,
          erc20L1Address: token ? token.address : undefined
        })

        estimateGasResult = {
          ...partialEstimateGasResult,
          estimatedChildChainSubmissionCost: constants.Zero
        }
      }

      setGasSummary({
        status: 'success',
        estimatedParentChainGasFees: calculateEstimatedParentChainGasFees(
          estimateGasResult.estimatedParentChainGas,
          parentChainGasPrice
        ),
        estimatedChildChainGasFees: calculateEstimatedChildChainGasFees(
          estimateGasResult.estimatedChildChainGas,
          childChainGasPrice,
          estimateGasResult.estimatedChildChainSubmissionCost
        )
      })
    } catch (error) {
      console.error(error)
      setGasSummaryStatus('error')
    }
  }, [
    walletAddress,
    amountDebounced,
    childChainProvider,
    setGasSummaryStatus,
    isDepositMode,
    parentChainGasPrice,
    childChainGasPrice,
    token,
    parentChainProvider
  ])

  useEffect(() => {
    if (!isDepositMode) {
      if (
        isTokenArbitrumOneNativeUSDC(token?.address) ||
        isTokenArbitrumSepoliaNativeUSDC(token?.address)
      ) {
        setGasSummaryStatus('unavailable')
        return
      }
    }

    estimateGas()
  }, [
    // Re-run gas estimation when:
    estimateGas,
    isDepositMode, // when user switches deposit/withdraw mode
    amountDebounced,
    token, // when the token changes
    setGasSummaryStatus
  ])

  return gasSummary
}
