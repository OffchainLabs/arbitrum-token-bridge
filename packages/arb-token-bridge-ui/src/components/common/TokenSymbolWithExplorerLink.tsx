import { useMemo } from 'react'

import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import {
  NativeCurrencyErc20,
  useNativeCurrency
} from '../../hooks/useNativeCurrency'
import { createBlockExplorerUrlForToken } from '../../util/CommonUtils'
import { isTokenUSDC, sanitizeTokenSymbol } from '../../util/TokenUtils'
import { ExternalLink } from './ExternalLink'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const isERC20BridgeToken = (
  token: ERC20BridgeToken | NativeCurrencyErc20 | null
): token is ERC20BridgeToken =>
  token !== null && !token.hasOwnProperty('isCustom')

export function TokenSymbolWithExplorerLink({
  token,
  tokenSymbolOverride,
  isParentChain
}: {
  token: ERC20BridgeToken | NativeCurrencyErc20 | null
  tokenSymbolOverride?: string
  isParentChain: boolean
}) {
  const { l1, l2 } = useNetworksAndSigners()
  const chain = isParentChain ? l1.network : l2.network
  const nativeCurrency = useNativeCurrency({
    provider: isParentChain ? l1.provider : l2.provider
  })

  const symbol = useMemo(() => {
    if (!token) {
      return nativeCurrency.symbol
    }

    return (
      tokenSymbolOverride ??
      sanitizeTokenSymbol(token.symbol, {
        erc20L1Address: token.address,
        chain
      })
    )
  }, [token, tokenSymbolOverride, chain, nativeCurrency.symbol])

  /* we don't want to show explorer link for native currency (either ETH or custom token), or USDC because user can bridge USDC to USDC.e or native USDC, vice versa */
  if (
    token === null ||
    !isERC20BridgeToken(token) ||
    isTokenUSDC(token.address)
  ) {
    return <span>{symbol}</span>
  }
  return (
    <ExternalLink
      className="arb-hover underline"
      href={createBlockExplorerUrlForToken({
        explorerLink: chain.blockExplorers
          ? chain.blockExplorers.default.url
          : undefined,
        tokenAddress: isParentChain ? token.address : token.l2Address
      })}
    >
      <span>{symbol}</span>
    </ExternalLink>
  )
}
