import { useEffect } from 'react'

import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../../../util/TokenUtils'
import { useActions, useAppState } from '../../../state'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { TokenType } from '../../../hooks/arbTokenBridge.types'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { ChainId } from '../../../util/networks'

export function useUpdateUSDCTokenData() {
  const actions = useActions()
  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const { token } = arbTokenBridge
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)

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

    // When switching network, token might be undefined
    if (!token) {
      return
    }

    const commonUSDC = {
      name: 'USD Coin',
      type: TokenType.ERC20,
      symbol: 'USDC',
      decimals: 6,
      listIds: new Set<number>()
    }
    if (isArbOneUSDC && networks.destinationChain.id === ChainId.ArbitrumOne) {
      token.updateTokenData(CommonAddress.Ethereum.USDC)
      actions.app.setSelectedToken({
        ...commonUSDC,
        address: CommonAddress.Ethereum.USDC,
        l2Address: CommonAddress.ArbitrumOne['USDC.e']
      })
    } else if (
      isArbSepoliaUSDC &&
      networks.destinationChain.id === ChainId.ArbitrumSepolia
    ) {
      token.updateTokenData(CommonAddress.Sepolia.USDC)
      actions.app.setSelectedToken({
        ...commonUSDC,
        address: CommonAddress.Sepolia.USDC,
        l2Address: CommonAddress.ArbitrumSepolia['USDC.e']
      })
    }
  }, [
    actions.app,
    isDepositMode,
    networks.destinationChain.id,
    selectedToken,
    token
  ])
}
