import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isNetwork } from '../../../util/networks'
import { isTokenNativeUSDC } from '../../../util/TokenUtils'

/**
 * get source and destination token for lifi route
 */
export function getFromAndToTokenAddresses({
  isDepositMode,
  selectedToken,
  sourceChainId
}: {
  isDepositMode: boolean
  selectedToken: Pick<ERC20BridgeToken, 'address' | 'l2Address'> | null
  sourceChainId: number
}) {
  const {
    isArbitrum: isSourceArbitrum,
    isArbitrumSepolia: isSourceArbitrumSepolia
  } = isNetwork(sourceChainId)
  const fromToken = isDepositMode
    ? selectedToken?.address
    : selectedToken?.l2Address
  const toToken = isDepositMode
    ? selectedToken?.l2Address
    : selectedToken?.address

  if (isTokenNativeUSDC(selectedToken?.address) && !isDepositMode) {
    if (isSourceArbitrum) {
      return {
        toToken: CommonAddress.Ethereum.USDC,
        fromToken: CommonAddress.ArbitrumOne.USDC
      }
    }

    if (isSourceArbitrumSepolia) {
      return {
        toToken: CommonAddress.Sepolia.USDC,
        fromToken: CommonAddress.ArbitrumSepolia.USDC
      }
    }
  }

  return {
    fromToken,
    toToken
  }
}
