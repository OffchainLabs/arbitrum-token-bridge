import { Provider } from '@ethersproject/providers'
import { isNetwork } from '../../../util/networks'
import { getChainIdFromProvider } from './getChainIdFromProvider'
import { SelectedToken } from '../BridgeTransferStarterV2'
import { TokenType } from '../../../hooks/arbTokenBridge.types'
import {
  isTokenArbitrumGoerliNativeUSDC,
  isTokenArbitrumOneNativeUSDC,
  isTokenGoerliUSDC,
  isTokenMainnetUSDC
} from '../../../util/TokenUtils'

export const getBridgeTransferProperties = async ({
  sourceChainProvider,
  destinationChainProvider,
  selectedToken
}: {
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  selectedToken?: SelectedToken
}) => {
  const sourceChainId = await getChainIdFromProvider(sourceChainProvider)
  const destinationChainId = await getChainIdFromProvider(
    destinationChainProvider
  )

  const isBaseChainEthereum =
    isNetwork(sourceChainId).isEthereumMainnetOrTestnet
  const isBaseChainArbitrum = isNetwork(sourceChainId).isArbitrum
  const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

  const isDeposit =
    isBaseChainEthereum || (isBaseChainArbitrum && isDestinationChainOrbit)

  const tokenAddress = selectedToken?.address

  const isNativeCurrencyTransfer =
    !selectedToken || selectedToken?.type !== TokenType.ERC20

  const isUsdcTransfer =
    tokenAddress &&
    (isTokenMainnetUSDC(tokenAddress) ||
      isTokenArbitrumOneNativeUSDC(tokenAddress) ||
      isTokenArbitrumGoerliNativeUSDC(tokenAddress) ||
      isTokenGoerliUSDC(tokenAddress))

  return {
    isDeposit,
    isNativeCurrencyTransfer,
    isUsdcTransfer
  }
}
