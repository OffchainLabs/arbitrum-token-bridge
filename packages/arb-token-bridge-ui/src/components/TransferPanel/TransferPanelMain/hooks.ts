import { useEffect } from 'react'

import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../../../util/TokenUtils'
import { useActions } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isNetwork } from '../../../util/networks'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { useArbTokenBridge } from '../../../hooks/useArbTokenBridge'

export function useUpdateUSDCTokenData() {
  const actions = useActions()
  const arbTokenBridge = useArbTokenBridge()
  const { token } = arbTokenBridge
  const [selectedToken, setSelectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const {
    isArbitrumOne: isDestinationChainArbitrumOne,
    isArbitrumSepolia: isDestinationChainArbitrumSepolia
  } = isNetwork(networks.destinationChain.id)

  useEffect(() => {
    const isArbOneUSDC = isTokenArbitrumOneNativeUSDC(selectedToken?.address)
    const isArbSepoliaUSDC = isTokenArbitrumSepoliaNativeUSDC(
      selectedToken?.address
    )

    // If user select native USDC on L2, when switching to deposit mode,
    // we need to default to set the corresponding USDC on L1
    if (!isDepositMode) {
      return
    }

    if (typeof token === 'undefined') {
      return
    }

    if (isArbOneUSDC && isDestinationChainArbitrumOne) {
      token.updateTokenData(CommonAddress.Ethereum.USDC)
      setSelectedToken(CommonAddress.Ethereum.USDC)
    }

    if (isArbSepoliaUSDC && isDestinationChainArbitrumSepolia) {
      token.updateTokenData(CommonAddress.Sepolia.USDC)
      setSelectedToken(CommonAddress.Sepolia.USDC)
    }
  }, [
    actions.app,
    isDepositMode,
    isDestinationChainArbitrumOne,
    isDestinationChainArbitrumSepolia,
    selectedToken,
    setSelectedToken,
    token
  ])
}
