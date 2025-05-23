import { describe, it, expect } from 'vitest'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { processTokensFromList } from '../useArbTokenBridge'
import {
  BRIDGE_TOKEN_LISTS,
  fetchTokenListFromURL
} from '../../util/TokenListUtils'
import {
  fetchErc20L2GatewayAddress,
  fetchErc20ParentChainGatewayAddress
} from '../../util/TokenUtils'
import { ChainId } from '../../types/ChainId'

// can be found on https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json
// standard gateway token
const wBtcAddressOnEthereum =
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'.toLowerCase()

// custom gateway token
const lptAddressOnEthereum =
  '0x58b6a8a3302369daec383334672404ee733ab239'.toLowerCase()

const parentProvider = getProviderForChainId(ChainId.Ethereum)
const childProvider = getProviderForChainId(ChainId.ArbitrumOne)

describe('processTokensFromList', () => {
  it('token parent bridge address should be same as fetched parent gateway address', async () => {
    const { data: bridgeTokenList } = await fetchTokenListFromURL(
      BRIDGE_TOKEN_LISTS[2]!.url
    )

    const { bridgeTokensToAdd } = await processTokensFromList({
      arbTokenList: bridgeTokenList!,
      listId: BRIDGE_TOKEN_LISTS[2]!.id,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne
    })

    // WBTC, standard gateway
    const fetchedWbtcParentGatewayAddress =
      await fetchErc20ParentChainGatewayAddress({
        erc20ParentChainAddress: wBtcAddressOnEthereum,
        parentChainProvider: parentProvider,
        childChainProvider: childProvider
      })

    expect(
      bridgeTokensToAdd[
        wBtcAddressOnEthereum
      ]?.parentBridgeAddress?.toLowerCase()
    ).toEqual(fetchedWbtcParentGatewayAddress.toLowerCase())

    // LPT, custom gateway
    const fetchedLptParentGatewayAddress =
      await fetchErc20ParentChainGatewayAddress({
        erc20ParentChainAddress: lptAddressOnEthereum,
        parentChainProvider: parentProvider,
        childChainProvider: childProvider
      })

    expect(
      bridgeTokensToAdd[
        lptAddressOnEthereum
      ]?.parentBridgeAddress?.toLowerCase()
    ).toEqual(fetchedLptParentGatewayAddress.toLowerCase())
  })

  it('token child bridge address should be same as fetched child gateway address', async () => {
    const { data: bridgeTokenList } = await fetchTokenListFromURL(
      BRIDGE_TOKEN_LISTS[2]!.url
    )

    const { bridgeTokensToAdd } = await processTokensFromList({
      arbTokenList: bridgeTokenList!,
      listId: BRIDGE_TOKEN_LISTS[2]!.id,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne
    })

    // WBTC, standard gateway
    const fetchedWbtcChildGatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: wBtcAddressOnEthereum,
      l2Provider: childProvider
    })

    expect(
      bridgeTokensToAdd[
        wBtcAddressOnEthereum
      ]?.childBridgeAddress?.toLowerCase()
    ).toEqual(fetchedWbtcChildGatewayAddress.toLowerCase())

    // LPT, custom gateway
    const fetchedLptChildGatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: lptAddressOnEthereum,
      l2Provider: childProvider
    })

    expect(
      bridgeTokensToAdd[lptAddressOnEthereum]?.childBridgeAddress?.toLowerCase()
    ).toEqual(fetchedLptChildGatewayAddress.toLowerCase())
  })
})
