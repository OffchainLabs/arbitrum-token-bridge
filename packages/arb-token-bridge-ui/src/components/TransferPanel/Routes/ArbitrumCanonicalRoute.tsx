import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { utils } from 'ethers'
import { Route } from './Route'
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { isTokenNativeUSDC } from '../../../util/TokenUtils'
import { useRouteStore, ArbitrumRouteData } from '../hooks/useRouteStore'
import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import { getGasCostAndToken } from './getGasCostAndToken'
import {
  bridgedUsdcToken,
  nativeUsdcToken
} from '../../../util/CommonAddressUtils'

export function ArbitrumCanonicalRoute() {
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const {
    status: gasSummaryStatus,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees
  } = useGasSummary()
  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })
  const parentChainNativeCurrency = useNativeCurrency({
    provider: parentChainProvider
  })

  const { selectedRoute, setSelectedRoute } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute
    }),
    shallow
  )
  const [selectedToken] = useSelectedToken()

  // Get route data from centralized store
  const arbitrumData = useRouteStore(state => state.routes.arbitrum)

  const { gasCost, isLoading } = useMemo(
    () =>
      getGasCostAndToken({
        childChainNativeCurrency,
        parentChainNativeCurrency,
        gasSummaryStatus,
        estimatedChildChainGasFees,
        estimatedParentChainGasFees,
        isDepositMode
      }),
    [
      childChainNativeCurrency,
      estimatedChildChainGasFees,
      estimatedParentChainGasFees,
      gasSummaryStatus,
      isDepositMode,
      parentChainNativeCurrency
    ]
  )

  /**
   * For USDC:
   * - Withdrawing USDC.e, we receive USDC on Mainnet
   * - Depositing USDC, we receive USDC.e on Arbitrum
   */
  const isUsdcTransfer = isTokenNativeUSDC(selectedToken?.address)
  const overrideToken = isDepositMode ? bridgedUsdcToken : nativeUsdcToken

  if (!arbitrumData) {
    return null
  }

  return (
    <Route
      type="arbitrum"
      bridge={arbitrumData.bridge}
      bridgeIconURI={arbitrumData.bridgeIconURI}
      durationMs={arbitrumData.durationMs}
      amountReceived={arbitrumData.amountReceived}
      isLoadingGasEstimate={isLoading}
      overrideToken={isUsdcTransfer ? overrideToken : undefined}
      gasCost={
        gasCost && gasCost.length > 0
          ? gasCost.map(({ gasCost, gasToken }) => ({
              gasCost: utils
                .parseUnits(
                  gasCost.toFixed(childChainNativeCurrency.decimals),
                  gasToken.decimals
                )
                .toString(),
              gasToken
            }))
          : []
      }
      onSelectedRouteClick={setSelectedRoute}
      tag={'security-guaranteed'}
      selected={selectedRoute === 'arbitrum'}
    />
  )
}
