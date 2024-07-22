import { useMemo } from 'react'
import * as Sentry from '@sentry/react'

import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import {
  NativeCurrencyErc20,
  useNativeCurrency
} from '../../hooks/useNativeCurrency'
import { isTokenNativeUSDC, sanitizeTokenSymbol } from '../../util/TokenUtils'
import { ExternalLink } from './ExternalLink'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

const createBlockExplorerUrlForToken = ({
  explorerLink,
  tokenAddress
}: {
  explorerLink: string | undefined
  tokenAddress: string | undefined
}): string | undefined => {
  if (!explorerLink) {
    return undefined
  }
  if (!tokenAddress) {
    return undefined
  }
  try {
    const url = new URL(explorerLink)
    url.pathname += `token/${tokenAddress}`
    return url.toString()
  } catch (error) {
    Sentry.captureException(error)
    return undefined
  }
}

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
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain } =
    useNetworksRelationship(networks)
  const chain = isParentChain ? parentChain : childChain
  // always use native currency of child chain
  const nativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })

  const symbol = useMemo(() => {
    if (!token) {
      return nativeCurrency.symbol
    }

    return (
      tokenSymbolOverride ??
      sanitizeTokenSymbol(token.symbol, {
        erc20L1Address: token.address,
        chainId: chain.id
      })
    )
  }, [token, tokenSymbolOverride, chain, nativeCurrency.symbol])

  /* we don't want to show explorer link for native currency (either ETH or custom token), or USDC because user can bridge USDC to USDC.e or native USDC, vice versa */
  if (
    token === null ||
    !isERC20BridgeToken(token) ||
    isTokenNativeUSDC(token.address)
  ) {
    return <span>{symbol}</span>
  }

  const href = createBlockExplorerUrlForToken({
    explorerLink: chain.blockExplorers
      ? chain.blockExplorers.default.url
      : undefined,
    tokenAddress: isParentChain ? token.address : token.l2Address
  })

  return (
    <ExternalLink className="arb-hover underline" href={href}>
      <span>{symbol}</span>
    </ExternalLink>
  )
}
