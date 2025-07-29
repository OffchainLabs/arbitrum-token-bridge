import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'

import { useNetworks } from '../../../hooks/useNetworks'
import { Route } from './Route'
import { isNetwork } from '../../../util/networks'

import { getCctpTransferDuration } from '../../../hooks/useTransferDuration'
import { useRouteStore } from '../hooks/useRouteStore'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { getUsdcTokenAddressFromSourceChainId } from '../../../state/cctpState'
import {
  ERC20BridgeToken,
  TokenType
} from '../../../hooks/arbTokenBridge.types'

export function CctpRoute() {
  const [{ amount }] = useArbQueryParams()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const { selectedRoute, setSelectedRoute } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute
    }),
    shallow
  )

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

  return (
    <Route
      type="cctp"
      bridge={'Circle'}
      bridgeIconURI={'/images/CctpLogoColor.svg'}
      durationMs={getCctpTransferDuration(isTestnet) * 60 * 1_000}
      amountReceived={amount.toString()}
      overrideToken={nativeUsdcToken}
      isLoadingGasEstimate={false}
      gasCost={undefined}
      selected={selectedRoute === 'cctp'}
      onSelectedRouteClick={setSelectedRoute}
      tag="best-deal"
    />
  )
}
