import { useNetworks } from '../../../hooks/useNetworks'
import { Route, Token } from './Route'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { isNetwork } from '../../../util/networks'

import { CommonAddress } from '../../../util/CommonAddressUtils'
import { getCctpTransferDuration } from '../../../hooks/useTransferDuration'
import { useRouteStore } from '../hooks/useRouteStore'

const nativeUsdcToken: Token = {
  decimals: 6,
  address: CommonAddress.Ethereum.USDC,
  symbol: 'USDC',
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png'
}

// Only displayed during USDC transfers (Mainnet/ArbOne)
export function CctpRoute() {
  const amount = useAmountBigNumber()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const { selectedRoute, setSelectedRoute } = useRouteStore()

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
