import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { ConnectWalletButton } from '../TransferPanel/ConnectWalletButton'

/**
 * This component is a wrapper around ConnectWalletButton that handles special cases for mobile browsers in embed mode.
 *
 * Why we need this wrapper:
 * Mobile browsers implement stricter security constraints that block third-party applications (like iframes) from accessing:
 * - Cookies
 * - Web storage
 *
 * This prevents the wallet connection feature from functioning properly, as these connections rely on storing and
 * relaying messages and data through web storage. When users try to connect their wallet in a mobile browser while
 * the app is embedded in an iframe, the connection will fail due to these security restrictions.
 *
 * Solution:
 * When we detect that the user is on a mobile browser and the app is in embed mode, we redirect them to the
 * main Arbitrum Bridge website (bridge.arbitrum.io) where they can connect their wallet without these restrictions.
 */

const isMobileBrowser = () => {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent
  )
}

export function WidgetConnectWalletButton() {
  const [{ embedMode }] = useArbQueryParams()
  const isMobile = isMobileBrowser()

  if (embedMode && isMobile && window.top) {
    // Redirect to bridge.arbitrum.io in mobile browser when in embed mode
    window.top.location.href = 'https://bridge.arbitrum.io'
    return null
  }

  return <ConnectWalletButton />
}
