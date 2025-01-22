import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { shortenAddress } from '../../util/CommonUtils'
import { captureSentryErrorWithExtraData } from '../../util/SentryUtils'
import { ExternalLink } from '../common/ExternalLink'
import { Tooltip } from '../common/Tooltip'
import { TokenLogo } from './TokenLogo'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'

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
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'createBlockExplorerUrlForToken'
    })
    return undefined
  }
}

export const TokenInfoTooltip = ({
  token
}: {
  token: ERC20BridgeToken | null
}) => {
  const [networks] = useNetworks()
  const { isDepositMode, childChainProvider } =
    useNetworksRelationship(networks)
  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })

  if (!token) {
    return <span>{childChainNativeCurrency.symbol}</span>
  }

  const tokenAddress = isDepositMode ? token.address : token.l2Address

  const href = createBlockExplorerUrlForToken({
    explorerLink: networks.sourceChain.blockExplorers?.default.url,
    tokenAddress
  })

  return (
    <Tooltip
      wrapperClassName="underline"
      theme="dark"
      content={
        <div className="flex items-center space-x-2">
          <TokenLogo srcOverride={token.logoURI} className="h-7 w-7" />
          <div className="flex flex-col">
            <div className="flex space-x-1">
              <span className="text-lg font-normal">{token.symbol}</span>
              <span className="pt-[4px] text-xs font-normal text-gray-400">
                {token.name}
              </span>
            </div>
            {href && tokenAddress && (
              <ExternalLink
                className="arb-hover text-xs text-gray-300 underline"
                href={href}
              >
                <span>{shortenAddress(tokenAddress)}</span>
              </ExternalLink>
            )}
          </div>
        </div>
      }
      tippyProps={{
        arrow: false,
        interactive: true
      }}
    >
      {token.symbol}
    </Tooltip>
  )
}
