import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import { EthBridger, getChain } from '@arbitrum/sdk'

import { ERC20BridgeToken, TokenType } from './arbTokenBridge.types'
import { fetchErc20Data } from '../util/TokenUtils'
import { rpcURLs } from '../util/networks'
import useSWRImmutable from 'swr/immutable'

async function fetchCustomFeeToken(
  chainProvider: Provider
): Promise<ERC20BridgeToken> {
  const chain = await getChain(chainProvider)
  const ethBridger = await EthBridger.fromProvider(chainProvider)

  if (typeof ethBridger.nativeToken === 'undefined') {
    throw new Error('[fetchCustomFeeToken] native token is eth')
  }

  const address = ethBridger.nativeToken.toLowerCase()
  const parentChainId = chain.partnerChainID
  const parentChainProvider = new StaticJsonRpcProvider(rpcURLs[parentChainId])

  const { name, symbol, decimals } = await fetchErc20Data({
    address,
    provider: parentChainProvider
  })

  return {
    type: TokenType.ERC20,
    name,
    symbol,
    decimals,
    address,
    listIds: new Set()
  }
}

async function queryFunction(chainProvider: Provider) {
  try {
    return await fetchCustomFeeToken(chainProvider)
  } catch (error) {
    return null
  }
}

export function useCustomFeeToken({
  chainProvider
}: {
  chainProvider: Provider
}) {
  const { data } = useSWRImmutable(
    ['customFeeToken', chainProvider],
    ([, _chainProvider]) => queryFunction(_chainProvider),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )

  return data
}
