import { BigNumber, constants, utils } from 'ethers'
import { create } from 'zustand'
import { useAccount } from 'wagmi'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useNetworksAndSigners } from '../useNetworksAndSigners'
import { useAppState } from '../../state'
import { useGasPrice } from '../useGasPrice'
import { useDebouncedValue } from '../useDebouncedValue'
import {
  isTokenArbitrumGoerliNativeUSDC,
  isTokenArbitrumOneNativeUSDC
} from '../../util/TokenUtils'
import { withdrawTokenEstimateGas } from '../../util/TokenWithdrawalUtils'
import { withdrawEthEstimateGas } from '../../util/EthWithdrawalUtils'
import { depositEthEstimateGas } from '../../util/EthDepositUtils'
import { depositTokenEstimateGas } from '../../util/TokenDepositUtils'
import { ERC20BridgeToken } from '../arbTokenBridge.types'

const INITIAL_GAS_ESTIMATION_RESULT: GasEstimationResult = {
  // Estimated L1 gas, denominated in Wei, represented as a BigNumber
  estimatedL1Gas: constants.Zero,
  // Estimated L2 gas, denominated in Wei, represented as a BigNumber
  estimatedL2Gas: constants.Zero,
  // Estimated L2 submission cost is precalculated and includes gas price
  estimatedL2SubmissionCost: constants.Zero
}

const INITIAL_GAS_SUMMARY_RESULT: UseGasSummaryResult = {
  estimatedL1GasFees: 0,
  estimatedL2GasFees: 0
}

export type GasEstimationStatus =
  | 'loading'
  | 'success'
  | 'error'
  | 'unavailable'

export type GasEstimationResult = {
  estimatedL1Gas: BigNumber
  estimatedL2Gas: BigNumber
  estimatedL2SubmissionCost: BigNumber
}

export type UseGasSummaryResult = {
  estimatedL1GasFees: number
  estimatedL2GasFees: number
}

export function useGasSummary(
  amount: BigNumber,
  token: ERC20BridgeToken | null
): void {
  const {
    app: { arbTokenBridge, isDepositMode, arbTokenBridgeLoaded }
  } = useAppState()
  const networksAndSigners = useNetworksAndSigners()
  const {
    l1: { provider: l1Provider, network: l1Network },
    l2: { provider: l2Provider, network: l2Network }
  } = networksAndSigners
  const { address: walletAddress } = useAccount()
  const { gasSummary, setGasSummary, setGasSummaryStatus } =
    useGasSummaryStore()

  const l1GasPrice = useGasPrice({ provider: l1Provider })
  const l2GasPrice = useGasPrice({ provider: l2Provider })

  // Debounce the amount, so we run gas estimation only after the user has stopped typing for a bit
  const amountDebounced = useDebouncedValue(amount, 1_500)

  const [result, setResult] = useState<GasEstimationResult>(
    INITIAL_GAS_ESTIMATION_RESULT
  )

  const estimateGas = useCallback(async () => {
    if (!walletAddress) {
      return
    }

    const estimateGasFunctionParams = {
      amount,
      address: walletAddress,
      l2Provider
    }

    let estimateGasResult: GasEstimationResult = INITIAL_GAS_ESTIMATION_RESULT

    try {
      setGasSummaryStatus('loading')

      if (isDepositMode) {
        estimateGasResult = token
          ? await depositTokenEstimateGas({
              ...estimateGasFunctionParams,
              l1Provider,
              erc20L1Address: token.address
            })
          : await depositEthEstimateGas({
              ...estimateGasFunctionParams,
              l1Provider
            })
      } else {
        const partialEstimateGasResult = token
          ? await withdrawTokenEstimateGas({
              ...estimateGasFunctionParams,
              erc20L1Address: token.address
            })
          : await withdrawEthEstimateGas(estimateGasFunctionParams)

        estimateGasResult = {
          ...partialEstimateGasResult,
          estimatedL2SubmissionCost: constants.Zero
        }
      }

      setResult(estimateGasResult)
      setGasSummaryStatus('success')
    } catch (error) {
      console.error(error)
      setGasSummaryStatus('error')
    }
  }, [
    // Re-run gas estimation when:
    isDepositMode, // when user switches deposit/withdraw mode
    amount,
    token, // when the token changes
    l1Provider,
    l2Provider,
    walletAddress, // when user switches account or if user is not connected
    setGasSummaryStatus
  ])

  // Estimated L1 gas fees, denominated in Ether, represented as a floating point number
  const estimatedL1GasFees = useMemo(() => {
    const gasPrice = isDepositMode ? l1GasPrice : l2GasPrice
    return parseFloat(utils.formatEther(result.estimatedL1Gas.mul(gasPrice)))
  }, [isDepositMode, l1GasPrice, l2GasPrice, result.estimatedL1Gas])

  // Estimated L2 gas fees, denominated in Ether, represented as a floating point number
  const estimatedL2GasFees = useMemo(
    () =>
      parseFloat(
        utils.formatEther(
          result.estimatedL2Gas
            .mul(l2GasPrice)
            .add(result.estimatedL2SubmissionCost)
        )
      ),
    [result.estimatedL2Gas, l2GasPrice, result.estimatedL2SubmissionCost]
  )

  useEffect(() => {
    // Since we are using a debounced value, it's possible for the value to be outdated
    // Wait for it to sync before running the gas estimation
    if (!amountDebounced.eq(amount)) {
      setGasSummaryStatus('loading')
      return
    }

    if (!isDepositMode) {
      if (
        isTokenArbitrumOneNativeUSDC(token?.address) ||
        isTokenArbitrumGoerliNativeUSDC(token?.address)
      ) {
        setGasSummaryStatus('unavailable')
        return
      }
    }

    if (
      arbTokenBridgeLoaded &&
      arbTokenBridge &&
      arbTokenBridge.eth &&
      arbTokenBridge.token
    ) {
      estimateGas()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Re-run gas estimation when:
    estimateGas,
    isDepositMode, // when user switches deposit/withdraw mode
    amount, // when user changes the amount (check against the debounced value)
    amountDebounced,
    token, // when the token changes
    l1Network.id, // when L1 and L2 network id changes
    l2Network.id,
    arbTokenBridgeLoaded,
    walletAddress, // when user switches account or if user is not connected
    setGasSummaryStatus
  ])

  useEffect(() => {
    // rather than a deep equal, we are checking all the properties to see if they are sync

    if (
      gasSummary.estimatedL1GasFees !== estimatedL1GasFees ||
      gasSummary.estimatedL2GasFees !== estimatedL2GasFees
    ) {
      setGasSummary({
        estimatedL1GasFees,
        estimatedL2GasFees
      })
    }
  }, [
    result,
    isDepositMode,
    l1GasPrice,
    l2GasPrice,
    gasSummary,
    estimatedL1GasFees,
    estimatedL2GasFees,
    setGasSummary
  ])
}

type GasSummaryStore = {
  gasSummaryStatus: GasEstimationStatus
  gasSummary: UseGasSummaryResult
  setGasSummaryStatus: (gasSummaryStatus: GasEstimationStatus) => void
  setGasSummary: (gasSummary: UseGasSummaryResult) => void
}

export const useGasSummaryStore = create<GasSummaryStore>()(set => ({
  gasSummaryStatus: 'loading',
  gasSummary: INITIAL_GAS_SUMMARY_RESULT,
  setGasSummaryStatus: gasSummaryStatus =>
    set(() => ({
      gasSummaryStatus
    })),
  setGasSummary: gasSummary =>
    set(() => ({
      gasSummary
    }))
}))
