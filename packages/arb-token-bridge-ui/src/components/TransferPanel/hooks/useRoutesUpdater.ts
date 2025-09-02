import { useMemo, useEffect } from 'react'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer'
import { useIsArbitrumCanonicalTransfer } from '../hooks/useIsCanonicalTransfer'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useAccount } from 'wagmi'
import { constants } from 'ethers'
import { getTokenOverride } from '../../../pages/api/crosschain-transfers/utils'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { useLifiSettingsStore } from '../hooks/useLifiSettingsStore'
import { isNetwork } from '../../../util/networks'
import { isLifiEnabled as isLifiEnabledUtil } from '../../../util/featureFlag'
import { isValidLifiTransfer } from '../../../pages/api/crosschain-transfers/utils'
import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import {
  useRouteStore,
  RouteType,
  CctpRouteData,
  LifiRouteData,
  ArbitrumRouteData,
  OftV2RouteData
} from './useRouteStore'
import { shallow } from 'zustand/shallow'
import { useLifiCrossTransfersRoute } from '../../../hooks/useLifiCrossTransferRoute'
import { Address } from 'viem'

// Helper function to determine eligible routes (sync)
function getEligibleRoutes({
  isOftV2Transfer,
  isCctpTransfer,
  amount,
  isDepositMode,
  isTestnet,
  sourceChainId,
  destinationChainId,
  selectedToken,
  isArbitrumCanonicalTransfer
}: {
  isOftV2Transfer: boolean
  isCctpTransfer: boolean
  amount: string
  isDepositMode: boolean
  isTestnet: boolean
  sourceChainId: number
  destinationChainId: number
  selectedToken: ERC20BridgeToken | null
  isArbitrumCanonicalTransfer: boolean
}): RouteType[] {
  const isLifiEnabled = isLifiEnabledUtil() && !isTestnet
  const eligibleRoutes: RouteType[] = []

  if (Number(amount) === 0) {
    return []
  }

  if (isOftV2Transfer) {
    eligibleRoutes.push('oftV2')
    return eligibleRoutes
  }

  if (isCctpTransfer) {
    eligibleRoutes.push('cctp')

    if (isLifiEnabled) {
      eligibleRoutes.push('lifi')
    }

    if (isDepositMode) {
      eligibleRoutes.push('arbitrum')
    }

    return eligibleRoutes
  }

  const isValidLifiRoute =
    isLifiEnabled &&
    isValidLifiTransfer({
      fromToken: isDepositMode
        ? selectedToken?.address
        : selectedToken?.l2Address,
      sourceChainId: sourceChainId,
      destinationChainId: destinationChainId
    })

  if (isValidLifiRoute) {
    eligibleRoutes.push('lifi')
  }

  if (isArbitrumCanonicalTransfer) {
    eligibleRoutes.push('arbitrum')
  }

  return eligibleRoutes
}

// Hook that updates the store when inputs change
export function useRoutesUpdater() {
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const [{ amount }] = useArbQueryParams()
  const isCctpTransfer = useIsCctpTransfer()
  const isOftV2Transfer = useIsOftV2Transfer()
  const [selectedToken] = useSelectedToken()
  const { address } = useAccount()
  const [{ destinationAddress }] = useArbQueryParams()
  const amountBN = useAmountBigNumber()
  const { disabledBridges, disabledExchanges, slippage } = useLifiSettingsStore(
    state => ({
      disabledBridges: state.disabledBridges,
      disabledExchanges: state.disabledExchanges,
      slippage: state.slippage
    }),
    shallow
  )

  const { isTestnet } = isNetwork(networks.sourceChain.id)
  const isArbitrumCanonicalTransfer = useIsArbitrumCanonicalTransfer()
  const setRouteState = useRouteStore(state => state.setRouteState)

  // Determine eligible routes
  const eligibleRoutes = useMemo(
    () =>
      getEligibleRoutes({
        isOftV2Transfer,
        isCctpTransfer,
        amount,
        isDepositMode,
        isTestnet,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        selectedToken,
        isArbitrumCanonicalTransfer
      }),
    [
      isOftV2Transfer,
      isCctpTransfer,
      amount,
      isDepositMode,
      isTestnet,
      networks.sourceChain.id,
      networks.destinationChain.id,
      selectedToken,
      isArbitrumCanonicalTransfer
    ]
  )

  // Always call LiFi hook if LiFi is enabled (to avoid conditional hook calls)
  const overrideToken = useMemo(
    () =>
      getTokenOverride({
        sourceChainId: networks.sourceChain.id,
        fromToken: selectedToken?.address,
        destinationChainId: networks.destinationChain.id
      }),
    [
      selectedToken?.address,
      networks.sourceChain.id,
      networks.destinationChain.id
    ]
  )

  const lifiParameters = {
    fromAddress: address,
    fromAmount: amountBN.toString(),
    fromChainId: networks.sourceChain.id,
    fromToken: overrideToken.source?.address || constants.AddressZero,
    toAddress: (destinationAddress as Address) || address,
    toChainId: networks.destinationChain.id,
    toToken: overrideToken.destination?.address || constants.AddressZero,
    denyBridges: disabledBridges,
    denyExchanges: disabledExchanges,
    slippage
  }

  const {
    data: lifiRoutes,
    isLoading: isLifiLoading,
    error: lifiError
  } = useLifiCrossTransfersRoute(lifiParameters)

  // Determine if there's an overall error
  const hasError = lifiError && eligibleRoutes.includes('lifi')

  // Construct route data
  const routeData = useMemo(() => {
    const data: {
      oftV2?: OftV2RouteData
      cctp?: CctpRouteData
      lifi?: LifiRouteData[]
      arbitrum?: ArbitrumRouteData
    } = {}

    // OFT V2 route data
    if (eligibleRoutes.includes('oftV2')) {
      data.oftV2 = {
        type: 'oftV2',
        bridge: 'LayerZero',
        bridgeIconURI: '/icons/layerzero.svg',
        durationMs: 5 * 60 * 1_000, // 5 minutes
        amountReceived: amount.toString()
      }
    }

    // CCTP route data
    if (eligibleRoutes.includes('cctp')) {
      data.cctp = {
        type: 'cctp',
        bridge: 'Circle CCTP',
        bridgeIconURI: '/icons/cctp.svg',
        durationMs: 1 * 60 * 1_000, // 1 minute
        amountReceived: amount.toString()
      }
    }

    // LiFi route data
    if (eligibleRoutes.includes('lifi') && lifiRoutes) {
      const cheapestRoute = lifiRoutes.find(route =>
        route.protocolData.orders.includes('CHEAPEST' as any)
      )
      const fastestRoute = lifiRoutes.find(route =>
        route.protocolData.orders.includes('FASTEST' as any)
      )

      const lifiData: LifiRouteData[] = []

      if (cheapestRoute) {
        lifiData.push({
          type: 'lifi-cheapest',
          route: cheapestRoute,
          tag: 'best-deal'
        })
      }

      if (fastestRoute) {
        lifiData.push({
          type: 'lifi-fastest',
          route: fastestRoute,
          tag: 'fastest'
        })
      }

      if (lifiData.length === 1 && lifiData[0]) {
        lifiData[0].type = 'lifi'
      }

      data.lifi = lifiData
    }

    // Arbitrum canonical route data
    if (eligibleRoutes.includes('arbitrum')) {
      data.arbitrum = {
        type: 'arbitrum',
        bridge: 'Arbitrum Bridge',
        bridgeIconURI: '/icons/arbitrum.svg',
        durationMs: (isTestnet ? 1 : 7) * 24 * 60 * 60 * 1_000, // 1 day testnet, 7 days mainnet
        amountReceived: amount.toString()
      }
    }

    return data
  }, [eligibleRoutes, lifiRoutes, amount, isTestnet])

  // Determine flags
  const flags = useMemo(
    () => ({
      hasLowLiquidity:
        eligibleRoutes.includes('lifi') && !lifiRoutes && !isLifiLoading
    }),
    [eligibleRoutes, lifiRoutes, isLifiLoading]
  )

  // Update store when data changes
  useEffect(() => {
    setRouteState({
      eligibleRoutes,
      isLoading: isLifiLoading,
      error: hasError
        ? lifiError?.message || 'Failed to load LiFi routes'
        : null,
      data: routeData,
      flags
    })
  }, [
    eligibleRoutes,
    isLifiLoading,
    hasError,
    lifiError?.message,
    routeData,
    flags,
    setRouteState
  ])
}
