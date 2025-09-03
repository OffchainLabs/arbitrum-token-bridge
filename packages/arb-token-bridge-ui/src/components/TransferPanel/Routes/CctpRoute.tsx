import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'

import { useNetworks } from '../../../hooks/useNetworks'
import { Route } from './Route'
import { getCctpTransferDuration } from '../../../hooks/useTransferDuration'
import { isNetwork } from '../../../util/networks'
import { useRouteStore } from '../hooks/useRouteStore'
import { getUsdcTokenAddressFromSourceChainId } from '../../../state/cctpState'
import {
  ERC20BridgeToken,
  TokenType
} from '../../../hooks/arbTokenBridge.types'

export function CctpRoute() {
  const [{ sourceChain }] = useNetworks()
  const { selectedRoute, setSelectedRoute } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute
    }),
    shallow
  )

  // Get route data from centralized store
  const cctpData = useRouteStore(state => state.routes.cctp)

  // Calculate duration based on network context
  const { isTestnet } = isNetwork(sourceChain.id)
  const durationMs = getCctpTransferDuration(isTestnet) * 60 * 1_000

  const nativeUsdcToken: ERC20BridgeToken = useMemo(
    () => ({
      decimals: 6,
      address: getUsdcTokenAddressFromSourceChainId(sourceChain.id),
      symbol: 'USDC',
      type: TokenType.ERC20,
      name: 'USD Coin',
      listIds: new Set<string>(),
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png'
    }),
    [sourceChain.id]
  )

  if (!cctpData) {
    return null
  }

  return (
    <Route
      type="cctp"
      bridge={cctpData.bridge}
      bridgeIconURI={cctpData.bridgeIconURI}
      durationMs={durationMs}
      amountReceived={cctpData.amountReceived}
      overrideToken={nativeUsdcToken}
      isLoadingGasEstimate={false}
      gasCost={undefined}
      selected={selectedRoute === 'cctp'}
      onSelectedRouteClick={setSelectedRoute}
      tag={cctpData.tag}
    />
  )
}
