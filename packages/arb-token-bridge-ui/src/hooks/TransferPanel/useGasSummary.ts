import { BigNumber, constants, utils } from 'ethers'
import { useMemo } from 'react'
import { useDebounce } from '@uidotdev/usehooks'

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
import { useIsOftV2Transfer } from '../../components/TransferPanel/hooks/useIsOftV2Transfer'
import { useOftV2FeeEstimates } from './useOftV2FeeEstimates'
import {
  isWithdrawalFromArbOneToEthereum,
  isWithdrawalFromArbSepoliaToSepolia
} from '../../util/networks'
import { useSelectedTokenDecimals } from './useSelectedTokenDecimals'
import { useArbQueryParams } from '../useArbQueryParams'
import { truncateExtraDecimals } from '../../util/NumberUtils'
import { useAccount } from 'wagmi'

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

export function getGasSummaryStatus({
  selectedTokenAddress,
  amountBigNumber,
  balance,
  gasEstimatesError,
  oftFeeEstimatesError,
  oftFeeSummaryLoading,
  sourceChainId,
  destinationChainId
}: {
  selectedTokenAddress: string | undefined
  amountBigNumber: BigNumber
  balance: BigNumber | null
  gasEstimatesError: any
  oftFeeEstimatesError: boolean
  oftFeeSummaryLoading: boolean
  sourceChainId: number
  destinationChainId: number
}): GasEstimationStatus {
  if (
    (isTokenArbitrumOneNativeUSDC(selectedTokenAddress) &&
      isWithdrawalFromArbOneToEthereum({
        sourceChainId,
        destinationChainId
      })) ||
    (isTokenArbitrumSepoliaNativeUSDC(selectedTokenAddress) &&
      isWithdrawalFromArbSepoliaToSepolia({
        sourceChainId,
        destinationChainId
      }))
  ) {
    return 'unavailable'
  }

  if (balance === null || oftFeeSummaryLoading) {
    return 'loading'
  }

  if (amountBigNumber.gt(balance)) {
    return 'insufficientBalance'
  }

  if (gasEstimatesError || oftFeeEstimatesError) {
    return 'error'
  }

  return 'success'
}

export function useGasSummary(): UseGasSummaryResult {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const [{ amount }] = useArbQueryParams()
  const debouncedAmount = useDebounce(amount, 300)
  const { isConnected } = useAccount()

  const decimals = useSelectedTokenDecimals()

  const amountBigNumber = useMemo(() => {
    // if embedded and wallet is not connected yet, show gas estimation for zero amount
    if (!isConnected) {
      return constants.Zero
    }

    if (isNaN(Number(debouncedAmount))) {
      return constants.Zero
    }
    const amountSafe = debouncedAmount || '0'

    const correctDecimalsAmount = truncateExtraDecimals(amountSafe, decimals)

    return utils.parseUnits(correctDecimalsAmount, decimals)
  }, [debouncedAmount, decimals, isConnected])

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

  const gasSummaryStatus = useMemo(
    () =>
      getGasSummaryStatus({
        selectedTokenAddress: selectedToken?.address,
        amountBigNumber,
        balance,
        gasEstimatesError,
        oftFeeEstimatesError,
        oftFeeSummaryLoading,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id
      }),
    [
      selectedToken,
      amountBigNumber,
      balance,
      gasEstimatesError,
      oftFeeEstimatesError,
      oftFeeSummaryLoading,
      networks
    ]
  )

  return {
    status: gasSummaryStatus,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  }
}
