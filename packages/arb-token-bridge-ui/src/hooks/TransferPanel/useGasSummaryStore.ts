import { BigNumber, constants, utils } from 'ethers'
import { create } from 'zustand'
import { useAccount } from 'wagmi'
import { useEffect, useMemo, useState } from 'react'

import { TransferPanelSummaryToken } from '../../components/TransferPanel/TransferPanelSummary'
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

const INITIAL_GAS_SUMMARY_RESULT: UseGasSummaryResult = {
  status: 'idle',
  estimatedL1GasFees: 0,
  estimatedL2GasFees: 0
}

export type GasEstimationStatus =
  | 'idle'
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
  status: GasEstimationStatus
  estimatedL1GasFees: number
  estimatedL2GasFees: number
}

export function useGasSummary(
  amount: BigNumber,
  token: TransferPanelSummaryToken | null,
  shouldRunGasEstimation: boolean
) {
  const {
    app: { arbTokenBridge, isDepositMode }
  } = useAppState()
  const networksAndSigners = useNetworksAndSigners()
  const { l1, l2 } = networksAndSigners
  const { address: walletAddress } = useAccount()
  const { gasSummary, setGasSummary } = useGasSummaryStore()

  const l1GasPrice = useGasPrice({ provider: l1.provider })
  const l2GasPrice = useGasPrice({ provider: l2.provider })

  // Debounce the amount, so we run gas estimation only after the user has stopped typing for a bit
  const amountDebounced = useDebouncedValue(amount, 1500)

  const [status, setStatus] = useState<GasEstimationStatus>('idle')
  const [result, setResult] = useState<GasEstimationResult>({
    // Estimated L1 gas, denominated in Wei, represented as a BigNumber
    estimatedL1Gas: constants.Zero,
    // Estimated L2 gas, denominated in Wei, represented as a BigNumber
    estimatedL2Gas: constants.Zero,
    // Estimated L2 submission cost is precalculated and includes gas price
    estimatedL2SubmissionCost: constants.Zero
  })

  // Estimated L1 gas fees, denominated in Ether, represented as a floating point number
  const estimatedL1GasFees = useMemo(() => {
    const gasPrice = isDepositMode ? l1GasPrice : l2GasPrice
    return parseFloat(utils.formatEther(result.estimatedL1Gas.mul(gasPrice)))
  }, [result.estimatedL1Gas, isDepositMode, l1GasPrice, l2GasPrice])

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
    // When the user starts typing, set the status to `loading` for better UX
    // The value is debounced, so we'll start fetching the gas estimates only when the user stops typing
    if (shouldRunGasEstimation) {
      setStatus('loading')
    }
  }, [amount, shouldRunGasEstimation])

  useEffect(() => {
    async function estimateGas() {
      // Since we are using a debounced value, it's possible for the value to be outdated
      // Wait for it to sync before running the gas estimation
      if (!amountDebounced.eq(amount)) {
        return
      }

      // Don't run gas estimation if the value is zero or the flag is not set
      if (amountDebounced.isZero() || !shouldRunGasEstimation) {
        setStatus('idle')
        return
      }

      if (!walletAddress) {
        return
      }

      try {
        setStatus('loading')

        if (isDepositMode) {
          if (token) {
            const estimateGasResult = await depositTokenEstimateGas({
              amount,
              address: walletAddress,
              erc20L1Address: token.address,
              l1Provider: l1.provider,
              l2Provider: l2.provider
            })

            setResult(estimateGasResult)
          } else {
            const estimateGasResult = await depositEthEstimateGas({
              amount: amountDebounced,
              address: walletAddress,
              l1Provider: l1.provider,
              l2Provider: l2.provider
            })

            setResult(estimateGasResult)
          }
        } else {
          if (token) {
            let estimateGasResult: {
              estimatedL1Gas: BigNumber
              estimatedL2Gas: BigNumber
            }

            if (
              isTokenArbitrumOneNativeUSDC(token.address) ||
              isTokenArbitrumGoerliNativeUSDC(token.address)
            ) {
              estimateGasResult = {
                estimatedL1Gas: constants.Zero,
                estimatedL2Gas: constants.Zero
              }
              setStatus('unavailable')
              return
            } else {
              estimateGasResult = await withdrawTokenEstimateGas({
                amount: amountDebounced,
                erc20L1Address: token.address,
                address: walletAddress,
                l2Provider: l2.provider
              })
            }

            setResult({
              ...estimateGasResult,
              estimatedL2SubmissionCost: constants.Zero
            })
          } else {
            const estimateGasResult = await withdrawEthEstimateGas({
              amount: amountDebounced,
              address: walletAddress,
              l2Provider: l2.provider
            })

            setResult({
              ...estimateGasResult,
              estimatedL2SubmissionCost: constants.Zero
            })
          }
        }

        setStatus('success')
      } catch (error) {
        console.error(error)
        setStatus('error')
      }
    }

    if (arbTokenBridge && arbTokenBridge.eth && arbTokenBridge.token) {
      estimateGas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Re-run gas estimation when:
    isDepositMode, // when user switches deposit/withdraw mode
    amount, // when user changes the amount (check against the debounced value)
    amountDebounced,
    token, // when the token changes
    shouldRunGasEstimation, // passed externally - estimate gas only if user balance crosses a threshold
    l1.network.id, // when L1 and L2 network id changes
    l2.network.id,
    walletAddress // when user switches account or if user is not connected
  ])

  const gasSummaryResult = {
    status,
    estimatedL1GasFees,
    estimatedL2GasFees
  }

  // rather than a deep equal, we are checking all the properties to see if they are sync
  if (
    gasSummary.status !== status &&
    gasSummary.estimatedL1GasFees !== estimatedL1GasFees &&
    gasSummary.estimatedL2GasFees !== estimatedL2GasFees
  ) {
    setGasSummary(gasSummaryResult)
  }
}

type GasSummaryStore = {
  gasSummary: UseGasSummaryResult
  setGasSummary: (gasSummary: UseGasSummaryResult) => void
}

export const useGasSummaryStore = create<GasSummaryStore>()(set => ({
  gasSummary: INITIAL_GAS_SUMMARY_RESULT,
  setGasSummary: gasSummary => set(() => ({ gasSummary }))
}))
