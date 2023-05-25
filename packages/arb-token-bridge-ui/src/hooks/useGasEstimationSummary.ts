import { BigNumber, constants, utils } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { useLatest } from 'react-use'
import { TransferPanelSummaryToken } from '../components/TransferPanel/TransferPanelSummary'
import { useDebouncedValue } from './useDebouncedValue'
import { useGasPrice } from './useGasPrice'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { depositEthEstimateGas } from '../util/EthDepositUtils'
import { depositTokenEstimateGas } from '../util/TokenDepositUtils'
import { withdrawTokenEstimateGas } from '../util/TokenWithdrawalUtils'
import { withdrawEthEstimateGas } from '../util/EthWithdrawalUtils'
import { tokenRequiresApprovalOnL2 } from '../util/L2ApprovalUtils'
import { useAppState } from '../state'

export type GasEstimationStatus = 'idle' | 'loading' | 'success' | 'error'

export type GasEstimationResult = {
  estimatedL1Gas: BigNumber
  estimatedL2Gas: BigNumber
  estimatedL2SubmissionCost: BigNumber
}

export type UseGasSummaryResult = {
  status: GasEstimationStatus
  estimatedL1GasFees: number
  estimatedL2GasFees: number
  estimatedTotalGasFees: number
}

export function useGasEstimationSummary(
  amount: BigNumber,
  token: TransferPanelSummaryToken | null,
  shouldRunGasEstimation: boolean
): UseGasSummaryResult {
  const {
    app: { arbTokenBridge, isDepositMode }
  } = useAppState()

  const networksAndSigners = useNetworksAndSigners()
  const { l1, l2 } = networksAndSigners
  const latestNetworksAndSigners = useLatest(networksAndSigners)
  const walletAddress = arbTokenBridge.walletAddress

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
  const estimatedL1GasFees = useMemo(
    () => parseFloat(utils.formatEther(result.estimatedL1Gas.mul(l1GasPrice))),
    [result.estimatedL1Gas, l1GasPrice]
  )

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

  const estimatedTotalGasFees = useMemo(
    () => estimatedL1GasFees + estimatedL2GasFees,
    [estimatedL1GasFees, estimatedL2GasFees]
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

      try {
        setStatus('loading')

        if (isDepositMode) {
          if (token) {
            const estimateGasResult = await depositTokenEstimateGas({
              l1Provider: l1.provider,
              l2Provider: l2.provider
            })

            setResult(estimateGasResult)
          } else {
            const estimateGasResult = await depositEthEstimateGas({
              amount: amountDebounced,
              walletAddress,
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

            // TODO: Update, as this only handles LPT
            if (
              tokenRequiresApprovalOnL2(
                token.address,
                latestNetworksAndSigners.current.l2.network.id
              )
            ) {
              estimateGasResult = {
                estimatedL1Gas: BigNumber.from(5_000),
                estimatedL2Gas: BigNumber.from(10_000)
              }
            } else {
              estimateGasResult = await withdrawTokenEstimateGas({
                amount: amountDebounced,
                erc20L1Address: token.address,
                walletAddress,
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
              walletAddress,
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
    isDepositMode,
    amount,
    amountDebounced,
    token,
    shouldRunGasEstimation,
    l1.network.id,
    l1.network.id,
    walletAddress
  ])

  return {
    status,
    estimatedL1GasFees,
    estimatedL2GasFees,
    estimatedTotalGasFees
  }
}
