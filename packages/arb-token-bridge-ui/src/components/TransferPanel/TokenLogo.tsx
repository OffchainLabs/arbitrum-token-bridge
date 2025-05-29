import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { SafeImage } from '../common/SafeImage'
import { useTokensFromLists, useTokensFromUser } from './TokenSearchUtils'

/**
 * Shows the selected token logo by default.
 * @param {Object} props
 * @param {string | null} [props.srcOverride] - Optional URL to override default token logo source
 * @param {string | undefined} [props.className] - Class name override
 */
export const TokenLogo = ({
  srcOverride,
  className,
  fallback
}: {
  srcOverride?: string | null
  className?: string
  fallback?: JSX.Element
}) => {
  const [selectedToken] = useSelectedToken()
  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()

  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const src = useMemo(() => {
    // Override to show the native currency logo
    if (srcOverride === null) {
      return nativeCurrency.logoUrl
    }

    if (typeof srcOverride !== 'undefined') {
      return srcOverride
    }

    if (selectedToken) {
      return (
        tokensFromLists[selectedToken.address]?.logoURI ??
        tokensFromUser[selectedToken.address]?.logoURI
      )
    }

    return nativeCurrency.logoUrl
  }, [
    nativeCurrency.logoUrl,
    selectedToken,
    srcOverride,
    tokensFromLists,
    tokensFromUser
  ])

  return (
    <SafeImage
      src={src}
      alt="Token logo"
      className={twMerge('h-5 w-5 shrink-0', className)}
      fallback={fallback}
    />
  )
}
