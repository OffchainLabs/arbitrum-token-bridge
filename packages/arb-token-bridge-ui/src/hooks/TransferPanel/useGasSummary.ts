import { BigNumber, utils } from 'ethers'
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
import {
  isWithdrawalFromArbOneToEthereum,
  isWithdrawalFromArbSepoliaToSepolia
} from '../../util/networks'
import { useAmountBigNumber } from '../../components/TransferPanel/hooks/useAmountBigNumber'
import { useRouteStore } from '../../components/TransferPanel/hooks/useRouteStore'

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
  sourceChainId,
  destinationChainId
}: {
  selectedTokenAddress: string | undefined
  amountBigNumber: BigNumber
  balance: BigNumber | null
  gasEstimatesError: any
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

  if (balance === null) {
    return 'loading'
  }

  if (amountBigNumber.gt(balance)) {
    return 'insufficientBalance'
  }

  if (gasEstimatesError) {
    return 'error'
  }

  return 'success'
}

export function useGasSummary(): UseGasSummaryResult {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const amountBigNumber = useDebounce(useAmountBigNumber(), 300)

  const parentChainGasPrice = useGasPrice({ provider: parentChainProvider })
  const childChainGasPrice = useGasPrice({ provider: childChainProvider })
  const selectedRoute = useRouteStore(state => state.selectedRoute)
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
        : selectedToken?.address,
      enabled: !!selectedRoute
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

  const gasSummaryStatus = useMemo(
    () =>
      getGasSummaryStatus({
        selectedTokenAddress: selectedToken?.address,
        amountBigNumber,
        balance,
        gasEstimatesError,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id
      }),
    [selectedToken, amountBigNumber, balance, gasEstimatesError, networks]
  )

  return {
    status: gasSummaryStatus,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  }
}
