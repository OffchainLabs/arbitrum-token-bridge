import { useNetworks } from '../../../hooks/useNetworks'
import { Route } from './Route'
import { useAmountBigNumber } from '../hooks/useAmountBigNumber'
import { ether } from '../../../constants'
import { isNetwork } from '../../../util/networks'
import { constants } from 'ethers'

import { CommonAddress } from '../../../util/CommonAddressUtils'
import { getCctpTransferDuration } from '../../../hooks/useTransferDuration'
import { useRouteStore } from '../hooks/useRouteStore'

const nativeUsdcToken = {
  decimals: 6,
  address: CommonAddress.Ethereum.USDC,
  symbol: 'USDC'
}

// Only displayed during USDC transfers (Mainnet/ArbOne)
export function CctpRoute() {
  const amount = useAmountBigNumber()
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const selectedRoute = useRouteStore(state => state.selectedRoute)

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
      gasToken={{ ...ether, address: constants.AddressZero }}
      selected={selectedRoute === 'cctp'}
    />
  )
}
