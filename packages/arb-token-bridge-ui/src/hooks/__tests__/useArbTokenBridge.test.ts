import { renderHook } from '@testing-library/react'
import { useAccount, sepolia } from 'wagmi'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { ChainId } from '../../util/networks'
import { useArbTokenBridge } from '../useArbTokenBridge'
import {
  addBridgeTokenListToBridge,
  BRIDGE_TOKEN_LISTS
} from '../../util/TokenListUtils'
import { fetchErc20ParentChainGatewayAddress } from '../../util/TokenUtils'

const wBtcAddressOnEthereum =
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'.toLowerCase()

const tokenBridgeParams = {
  l1: {
    provider: getProviderForChainId(ChainId.Ethereum),
    network: getWagmiChain(ChainId.Ethereum)
  },
  l2: {
    provider: getProviderForChainId(ChainId.ArbitrumOne),
    network: getWagmiChain(ChainId.ArbitrumOne)
  }
}

describe('useArbTokenBridge', () => {
  it('bridgeToken parent bridge address should be same as fetched parent gateway address', async () => {
    const { result: bridge } = renderHook(() =>
      useArbTokenBridge(tokenBridgeParams)
    )
    const bridgeTokenList = BRIDGE_TOKEN_LISTS[2]!

    addBridgeTokenListToBridge(bridgeTokenList, bridge.current)

    const fetchedAddress = await fetchErc20ParentChainGatewayAddress({
      erc20ParentChainAddress: wBtcAddressOnEthereum,
      parentChainProvider: tokenBridgeParams.l1.provider,
      childChainProvider: tokenBridgeParams.l2.provider
    })

    expect(
      bridge.current.bridgeTokens?.[
        wBtcAddressOnEthereum
      ]?.parentBridgeAddress?.toLowerCase()
    ).toEqual(fetchedAddress.toLowerCase())
  })
})
