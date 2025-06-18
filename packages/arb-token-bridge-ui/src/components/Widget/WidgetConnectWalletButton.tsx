import { useCallback } from 'react'
import { ConnectWalletButton } from '../TransferPanel/ConnectWalletButton'
import { useEmbedMode } from '../../hooks/useEmbedMode'

/**
 * A wrapper around ConnectWalletButton that handles mobile browser restrictions in embed mode.
 *
 * Mobile browsers block iframes from accessing cookies and web storage, which breaks wallet connections.
 * When detected, users are redirected to bridge.arbitrum.io with their query parameters preserved.
 */

const isMobileBrowser = () => {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent
  )
}

export function WidgetConnectWalletButton() {
  const { embedMode } = useEmbedMode()
  const isMobile = isMobileBrowser()

  const handleClick = useCallback(() => {
    if (embedMode && isMobile && window.top) {
      const currentParams = new URLSearchParams(window.location.search)
      currentParams.delete('embedMode')

      const newUrl = `https://bridge.arbitrum.io${
        currentParams.toString() ? `?${currentParams.toString()}` : ''
      }`
      window.top.location.href = newUrl // redirect the parent window to bridge.arbitrum.io
    }
  }, [embedMode, isMobile])

  return (
    <ConnectWalletButton
      onClick={embedMode && isMobile && window.top ? handleClick : undefined}
    />
  )
}
