import { useEffect } from 'react'

import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../../../util/TokenUtils'
import { useActions, useAppState } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isNetwork } from '../../../util/networks'
import { getTransferMode } from '../../../util/getTransferMode'
import { useSelectedToken } from '../../../hooks/useSelectedToken'

export function useUpdateUSDCTokenData() {
  const actions = useActions()
  const {
    app: {
      arbTokenBridge: { token }
    }
  } = useAppState()
  const [selectedToken, setSelectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const transferMode = getTransferMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })
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
    if (transferMode === 'withdrawal') {
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
    transferMode,
    isDestinationChainArbitrumOne,
    isDestinationChainArbitrumSepolia,
    selectedToken,
    setSelectedToken,
    token
  ])
}
