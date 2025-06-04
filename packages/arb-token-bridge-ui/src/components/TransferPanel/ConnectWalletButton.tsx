import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { isMobileBrowser } from '../../util/CommonUtils'
import { Button } from '../common/Button'

export function ConnectWalletButton() {
  const { openConnectModal } = useConnectModal()
  const [{ embedMode }] = useArbQueryParams()
  const isMobile = isMobileBrowser()

  const handleClick = () => {
    if (embedMode && isMobile && window.top) {
      // Redirect to bridge.arbitrum.io in mobile browser when in embed mode
      window.top.location.href = 'https://bridge.arbitrum.io'
    } else if (openConnectModal) {
      openConnectModal()
    }
  }

  return (
    <Button
      variant="primary"
      onClick={handleClick}
      className="w-full border border-lime-dark bg-lime-dark py-3 text-lg lg:text-2xl"
    >
      <span className="block w-full truncate">
        {embedMode && isMobile ? 'Go to Arbitrum Bridge' : 'Connect Wallet'}
      </span>
    </Button>
  )
}
