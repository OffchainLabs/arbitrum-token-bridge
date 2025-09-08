import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { utils } from 'ethers'
import { Route } from './Route'
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import {
  getOrbitDepositDuration,
  getStandardDepositDuration,
  getWithdrawalDuration
} from '../../../hooks/useTransferDuration'
import { isNetwork } from '../../../util/networks'
import dayjs from 'dayjs'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { isTokenNativeUSDC } from '../../../util/TokenUtils'
import { useRouteStore } from '../hooks/useRouteStore'
import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import { getGasCostAndToken } from './getGasCostAndToken'
import {
  bridgedUsdcToken,
  nativeUsdcToken
} from '../../../util/CommonAddressUtils'

function getDuration({
  isTestnet,
  sourceChainId,
  isTeleportMode,
  isWithdrawal,
  isOrbitChain
}: {
  isTestnet: boolean
  sourceChainId: number
  isTeleportMode: boolean
  isWithdrawal: boolean
  isOrbitChain: boolean
}) {
  if (isTeleportMode) {
    return (
      getStandardDepositDuration(isTestnet) + getOrbitDepositDuration(isTestnet)
    )
  }

  if (isWithdrawal) {
    return getWithdrawalDuration({
      createdAt: dayjs().valueOf(),
      sourceChainId: sourceChainId
    })
  }

  if (isOrbitChain) {
    return getOrbitDepositDuration(isTestnet)
  }

  return getStandardDepositDuration(isTestnet)
}

export function ArbitrumCanonicalRoute() {
  const [networks] = useNetworks()
  const {
    childChain,
    isTeleportMode,
    childChainProvider,
    parentChainProvider,
    isDepositMode
  } = useNetworksRelationship(networks)
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
  const { isTestnet, isOrbitChain } = isNetwork(childChain.id)

  const { selectedRoute, setSelectedRoute } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute
    }),
    shallow
  )
  const [selectedToken] = useSelectedToken()

  const arbitrumData = useRouteStore(
    state => state.routes.find(route => route.type === 'arbitrum')?.data
  )

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

  const durationMs =
    getDuration({
      isTestnet,
      isWithdrawal: !isDepositMode,
      sourceChainId: networks.sourceChain.id,
      isTeleportMode,
      isOrbitChain
    }) *
    60 *
    1_000

  if (!arbitrumData) {
    return null
  }

  return (
    <Route
      type="arbitrum"
      bridge="Arbitrum Bridge"
      bridgeIconURI="/icons/arbitrum.svg"
      durationMs={durationMs}
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
      tag="security-guaranteed"
      selected={selectedRoute === 'arbitrum'}
    />
  )
}
