import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

import { BRIDGE_TOKEN_LISTS } from '../../util/TokenListUtils'
import { useArbTokenBridge } from '../../hooks/useArbTokenBridge'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const {
    token: { addBridgeTokenListToBridge }
  } = useArbTokenBridge()
  const { childChain } = useNetworksRelationship(networks)

  useEffect(() => {
    if (!walletAddress) {
      return
    }

    const tokenListsToSet = BRIDGE_TOKEN_LISTS.filter(bridgeTokenList => {
      // Always load the Arbitrum Token token list
      if (bridgeTokenList.isArbitrumTokenTokenList) {
        return true
      }

      return (
        bridgeTokenList.originChainID === childChain.id &&
        bridgeTokenList.isDefault
      )
    })

    tokenListsToSet.forEach(bridgeTokenList => {
      addBridgeTokenListToBridge(bridgeTokenList)
    })
  }, [walletAddress, childChain.id, addBridgeTokenListToBridge])

  return <></>
}

export { TokenListSyncer }
