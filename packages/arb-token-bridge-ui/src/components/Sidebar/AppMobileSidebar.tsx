import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { MenuItem } from '@offchainlabs/cobalt'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePostHog } from 'posthog-js/react'
import { useAccount } from 'wagmi'
import { AccountMenuItem } from './AccountMenuItem'
import { MobileSidebar } from '@offchainlabs/cobalt'

export const AppMobileSidebar: React.FC<React.PropsWithChildren> = () => {
  const posthog = usePostHog()
  const { isConnected } = useAccount()

  return (
    <div className="flex flex-col justify-center sm:hidden">
      <MobileSidebar
        logger={posthog}
        activeMenu="Bridge"
        mobileToggleButtonClassOverrides="bg-transparent"
      >
        {isConnected ? (
          <AccountMenuItem />
        ) : (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <MenuItem
                title="Connect Wallet"
                onClick={openConnectModal}
                Icon={<PlusCircleIcon className="h-[24px] w-[24px] stroke-1" />}
                className="border-lime-dark bg-lime-dark py-3"
                isMobile
              />
            )}
          </ConnectButton.Custom>
        )}
      </MobileSidebar>
    </div>
  )
}
