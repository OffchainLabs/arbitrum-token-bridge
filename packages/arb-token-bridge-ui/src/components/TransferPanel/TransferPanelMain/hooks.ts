import { useEffect } from 'react'

import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../../../util/TokenUtils'
import { useActions, useAppState } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { TokenType } from '../../../hooks/arbTokenBridge.types'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { isNetwork } from '../../../util/networks'
import { getTransferMode } from '../../../util/getTransferMode'

const commonUSDC = {
  name: 'USD Coin',
  type: TokenType.ERC20,
  symbol: 'USDC',
  decimals: 6,
  listIds: new Set<string>()
}

export function useUpdateUSDCTokenData() {
  const actions = useActions()
  const {
    app: {
      arbTokenBridge: { token },
      selectedToken
    }
  } = useAppState()
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

    if (isArbOneUSDC && isDestinationChainArbitrumOne) {
      token.updateTokenData(CommonAddress.Ethereum.USDC)
      actions.app.setSelectedToken({
        ...commonUSDC,
        address: CommonAddress.Ethereum.USDC,
        l2Address: CommonAddress.ArbitrumOne['USDC.e']
      })
    }

    if (isArbSepoliaUSDC && isDestinationChainArbitrumSepolia) {
      token.updateTokenData(CommonAddress.Sepolia.USDC)
      actions.app.setSelectedToken({
        ...commonUSDC,
        address: CommonAddress.Sepolia.USDC,
        l2Address: CommonAddress.ArbitrumSepolia['USDC.e']
      })
    }
  }, [
    actions.app,
    transferMode,
    isDestinationChainArbitrumOne,
    isDestinationChainArbitrumSepolia,
    selectedToken,
    token
  ])
}
