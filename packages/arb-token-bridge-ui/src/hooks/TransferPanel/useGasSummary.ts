import { BigNumber, constants, utils } from 'ethers'
import { useAccount } from 'wagmi'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  calculateEstimatedL2GasFees,
  calculateEstimatedL1GasFees
} from '../../components/TransferPanel/TransferPanelMainUtils'
import { useSelectedToken } from '../../features/tokenLists/hooks/useSelectedToken'

const INITIAL_GAS_ESTIMATION_RESULT: GasEstimationResult = {
  // Estimated Parent Chain gas, denominated in Wei, represented as a BigNumber
  estimatedL1Gas: constants.Zero,
  // Estimated Child Chain gas, denominated in Wei, represented as a BigNumber
  estimatedL2Gas: constants.Zero,
  // Estimated Child Chain submission cost is precalculated and includes gas price
  estimatedL2SubmissionCost: constants.Zero
}

const INITIAL_GAS_SUMMARY_RESULT: UseGasSummaryResult = {
  status: 'loading',
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
  status: GasEstimationStatus
  estimatedL1GasFees: number
  estimatedL2GasFees: number
}

export function useGasSummary(): UseGasSummaryResult {
  const [networks] = useNetworks()
  const {
    childChain,
    childChainProvider,
    parentChain,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)
  const { address: walletAddress } = useAccount()
  const [{ amount }] = useArbQueryParams()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const [gasSummary, setGasSummary] = useState<UseGasSummaryResult>(
    INITIAL_GAS_SUMMARY_RESULT
  )
  const { sourceSelectedToken: token } = useSelectedToken({
    sourceChainId: parentChain.id,
    destinationChainId: childChain.id
  })

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
          estimatedL2SubmissionCost: constants.Zero
        }
      }

      setGasSummary({
        status: 'success',
        estimatedL1GasFees: calculateEstimatedL1GasFees(
          estimateGasResult.estimatedL1Gas,
          parentChainGasPrice
        ),
        estimatedL2GasFees: calculateEstimatedL2GasFees(
          estimateGasResult.estimatedL2Gas,
          childChainGasPrice,
          estimateGasResult.estimatedL2SubmissionCost
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
