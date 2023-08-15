import { useEffect, useState } from 'react'
import { Provider } from '@ethersproject/providers'
import { EthBridger } from '@arbitrum/sdk'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types'

export async function fetchCustomFeeToken(params: {
  chainProvider: Provider
  parentChainProvider: Provider
}): Promise<ERC20BridgeToken> {
  const { chainProvider, parentChainProvider } = params
  const ethBridger = await EthBridger.fromProvider(chainProvider)

  if (typeof ethBridger.nativeToken === 'undefined') {
    throw new Error('native token is eth')
  }

  const address = ethBridger.nativeToken
  const contract = ERC20__factory.connect(address, parentChainProvider)

  const [name, symbol, decimals] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals()
  ])

  return {
    type: TokenType.ERC20,
    name,
    symbol,
    decimals,
    address,
    listIds: new Set()
  }
}

export function useCustomFeeToken(params: {
  chainProvider: Provider
  parentChainProvider: Provider
}) {
  const { chainProvider, parentChainProvider } = params
  const [customFeeToken, setCustomFeeToken] = useState<
    undefined | null | ERC20BridgeToken
  >(undefined)

  useEffect(() => {
    async function update() {
      try {
        setCustomFeeToken(
          await fetchCustomFeeToken({ chainProvider, parentChainProvider })
        )
      } catch (error) {
        setCustomFeeToken(null)
      }
    }

    update()
  }, [chainProvider, parentChainProvider])

  return customFeeToken
}
