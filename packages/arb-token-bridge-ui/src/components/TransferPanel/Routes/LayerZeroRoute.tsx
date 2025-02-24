import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { constants } from 'ethers'
import { Route, RouteProps } from './Route'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { ether } from '../../../constants'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useOftV2FeeEstimates } from '../../../hooks/TransferPanel/useOftV2FeeEstimates'
import { useRouteStore } from '../hooks/useRouteStore'

// Only displayed during USDT transfers
export function LayerZeroRoute({
  onRouteSelected
}: Pick<RouteProps, 'onRouteSelected'>) {
  const amount = useAmountBigNumber()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const { selectedRoute } = useRouteStore()
  const [selectedToken] = useSelectedToken()
  const sourceChainNativeCurrency = useNativeCurrency({
    provider: networks.sourceChainProvider
  })
  const { feeEstimates, error, isLoading } = useOftV2FeeEstimates({
    sourceChainErc20Address: isDepositMode
      ? selectedToken?.address
      : selectedToken?.l2Address
  })

  const gasToken =
    'address' in sourceChainNativeCurrency
      ? sourceChainNativeCurrency
      : { ...ether, address: constants.AddressZero }

  if (error) {
    return null
  }

  return (
    <Route
      type="layerzero"
      bridge={'LayerZero'}
      bridgeIconURI={'/icons/layerzero.svg'}
      durationMs={5 * 60 * 1_000} // 5 minutes in miliseconds
      amountReceived={amount.toString()}
      isLoadingGasEstimate={isLoading}
      gasCost={
        feeEstimates?.sourceChainGasFee
          ? feeEstimates.sourceChainGasFee.toString()
          : undefined
      }
      gasToken={gasToken}
      onRouteSelected={onRouteSelected}
      selected={selectedRoute === 'layerzero'}
    />
  )
}
