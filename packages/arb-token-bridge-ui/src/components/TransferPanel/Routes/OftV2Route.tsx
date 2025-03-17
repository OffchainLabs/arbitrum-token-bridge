import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { constants } from 'ethers'
import { Route } from './Route'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { ether } from '../../../constants'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useOftV2FeeEstimates } from '../../../hooks/TransferPanel/useOftV2FeeEstimates'
import { useRouteStore } from '../hooks/useRouteStore'
import { useMemo } from 'react'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'

// Only displayed during USDT transfers
export function OftV2Route() {
  const [{ amount }] = useArbQueryParams()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const { selectedRoute, setSelectedRoute } = useRouteStore()
  const [selectedToken] = useSelectedToken()
  const sourceChainNativeCurrency = useNativeCurrency({
    provider: networks.sourceChainProvider
  })
  const { feeEstimates, error, isLoading } = useOftV2FeeEstimates({
    sourceChainErc20Address: isDepositMode
      ? selectedToken?.address
      : selectedToken?.l2Address
  })

  const gasCost = useMemo(() => {
    return [
      {
        gasCost: feeEstimates?.sourceChainGasFee
          ? feeEstimates.sourceChainGasFee.toString()
          : undefined,
        gasToken:
          'address' in sourceChainNativeCurrency
            ? sourceChainNativeCurrency
            : { ...ether, address: constants.AddressZero }
      }
    ]
  }, [feeEstimates?.sourceChainGasFee, sourceChainNativeCurrency])

  if (error) {
    return null
  }

  return (
    <Route
      type="oftV2"
      bridge={'LayerZero'}
      bridgeIconURI={'/icons/layerzero.svg'}
      durationMs={5 * 60 * 1_000} // 5 minutes in miliseconds
      amountReceived={amount.toString()}
      isLoadingGasEstimate={isLoading}
      gasCost={gasCost}
      selected={selectedRoute === 'oftV2'}
      onSelectedRouteClick={setSelectedRoute}
    />
  )
}
