import { useNetworks } from '../../../hooks/useNetworks'
import { Route, Token } from './Route'
import { isNetwork } from '../../../util/networks'

import { CommonAddress } from '../../../util/CommonAddressUtils'
import { getCctpTransferDuration } from '../../../hooks/useTransferDuration'
import { useRouteStore } from '../hooks/useRouteStore'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useMemo } from 'react'

export function CctpRoute() {
  const [{ amount }] = useArbQueryParams()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const { selectedRoute, setSelectedRoute } = useRouteStore()

  const nativeUsdcToken: Token = useMemo(
    () => ({
      decimals: 6,
      address: isTestnet
        ? CommonAddress.Sepolia.USDC
        : CommonAddress.Ethereum.USDC,
      symbol: 'USDC',
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png'
    }),
    [isTestnet]
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
    />
  )
}
