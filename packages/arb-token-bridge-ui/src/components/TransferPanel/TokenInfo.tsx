import { useMemo } from 'react'

import { useAppState } from '../../state'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { sanitizeImageSrc } from '../../util'
import { ExternalLink } from '../common/ExternalLink'
import { getExplorerUrl } from '../../util/networks'
import { useNetworks } from '../../hooks/useNetworks'
import { shortenAddress } from '../../util/CommonUtils'

type TokenInfoOptions = {
  showTokenLogo?: boolean
  shortenAddress?: boolean
}

export const TokenInfo = ({
  token,
  options = {
    showTokenLogo: true,
    shortenAddress: true
  }
}: {
  token: ERC20BridgeToken | null | undefined
  options?: TokenInfoOptions
}) => {
  const [networks] = useNetworks()
  const {
    app: {
      arbTokenBridge: { bridgeTokens }
    }
  } = useAppState()
  const tokenAddressLowercased = token?.address.toLocaleLowerCase()

  const tokenLogo = useMemo(() => {
    if (!options.showTokenLogo) {
      return undefined
    }
    if (typeof bridgeTokens === 'undefined') {
      return undefined
    }
    if (!token?.address) {
      return undefined
    }
    const logo = bridgeTokens[token.address]?.logoURI

    if (logo) {
      return sanitizeImageSrc(logo)
    }

    return undefined
  }, [bridgeTokens, token, options.showTokenLogo])

  return (
    <div className="flex flex-row items-center space-x-3">
      {options.showTokenLogo &&
        (tokenLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tokenLogo} alt="Token logo" className="h-6 w-6" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/30 bg-gray-dark text-sm font-medium">
            ?
          </div>
        ))}

      <div className="flex flex-col">
        <div className="flex items-center space-x-1">
          <span className="text-base">{token?.symbol}</span>
          <span className="text-xs text-white/70">{token?.name}</span>
        </div>
        {tokenAddressLowercased && (
          <ExternalLink
            href={`${getExplorerUrl(
              networks.sourceChain.id
            )}/token/${tokenAddressLowercased}`}
            className="arb-hover text-xs underline"
          >
            {options.shortenAddress
              ? shortenAddress(tokenAddressLowercased)
              : tokenAddressLowercased}
          </ExternalLink>
        )}
      </div>
    </div>
  )
}
