import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { constants, utils } from 'ethers'
import { Route } from './Route'
import { ether } from '../../../constants'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useOftV2FeeEstimates } from '../../../hooks/TransferPanel/useOftV2FeeEstimates'
import { useRouteStore } from '../hooks/useRouteStore'
import { useMemo } from 'react'
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary'
import { shallow } from 'zustand/shallow'

// Only displayed during USDT transfers
export function OftV2Route() {
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const { selectedRoute, setSelectedRoute } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute
    }),
    shallow
  )
  const [selectedToken] = useSelectedToken()

  const oftV2Data = useRouteStore(
    state => state.routes.find(route => route.type === 'oftV2')?.data
  )

  const { feeEstimates: oftFeeEstimates, error: oftFeeEstimatesError } =
    useOftV2FeeEstimates({
      sourceChainErc20Address: isDepositMode
        ? selectedToken?.address
        : selectedToken?.l2Address
    })
  const { estimatedChildChainGasFees, estimatedParentChainGasFees, status } =
    useGasSummary()

  const gasCost = useMemo(() => {
    if (
      status !== 'success' ||
      typeof estimatedParentChainGasFees !== 'number' ||
      typeof estimatedChildChainGasFees !== 'number'
    ) {
      return undefined
    }

    return [
      {
        gasCost: isDepositMode
          ? utils
              .parseUnits(estimatedParentChainGasFees.toString(), 18)
              .toString()
          : utils
              .parseUnits(estimatedChildChainGasFees.toString(), 18)
              .toString(),
        gasToken: {
          ...ether,
          address: constants.AddressZero
        }
      }
    ]
  }, [
    status,
    isDepositMode,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  ])

  const bridgeFee = useMemo(() => {
    if (!oftFeeEstimates?.sourceChainGasFee) {
      return undefined
    }

    return {
      fee: oftFeeEstimates.sourceChainGasFee.toString(),
      token: { ...ether, address: constants.AddressZero }
    }
  }, [oftFeeEstimates?.sourceChainGasFee])

  if (oftFeeEstimatesError || !oftV2Data) {
    return null
  }

  return (
    <Route
      type="oftV2"
      bridge="LayerZero"
      bridgeIconURI="/icons/layerzero.svg"
      durationMs={5 * 60 * 1_000} // 5 minutes in miliseconds
      amountReceived={oftV2Data.amountReceived}
      isLoadingGasEstimate={status === 'loading'}
      gasCost={gasCost}
      bridgeFee={bridgeFee}
      selected={selectedRoute === 'oftV2'}
      onSelectedRouteClick={setSelectedRoute}
    />
  )
}
