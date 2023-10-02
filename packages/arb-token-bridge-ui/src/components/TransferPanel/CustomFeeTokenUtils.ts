import { useEffect, useState } from 'react'
import { Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { EthBridger } from '@arbitrum/sdk'

import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types'
import { fetchErc20Info } from '../../util/TokenUtils'

export async function approveCustomFeeTokenForInboxEstimateGas(params: {
  chainProvider: Provider
  parentChainSigner: Signer
}) {
  const { chainProvider, parentChainSigner } = params
  const ethBridger = await EthBridger.fromProvider(chainProvider)

  const approveFeeTokenTxRequest = ethBridger.getApproveFeeTokenTxRequest()

  return parentChainSigner.estimateGas(approveFeeTokenTxRequest)
}

export async function fetchCustomFeeToken({
  chainProvider,
  parentChainProvider
}: {
  chainProvider: Provider
  parentChainProvider: Provider
}): Promise<ERC20BridgeToken> {
  const ethBridger = await EthBridger.fromProvider(chainProvider)

  if (typeof ethBridger.nativeToken === 'undefined') {
    throw new Error('[fetchCustomFeeToken] native token is eth')
  }

  const address = ethBridger.nativeToken.toLowerCase()

  const { name, symbol, decimals } = await fetchErc20Info({
    erc20Address: address,
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
