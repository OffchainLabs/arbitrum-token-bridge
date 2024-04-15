'use client'
import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { MenuItem } from '@offchainlabs/cobalt'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import dynamic from 'next/dynamic'
import { usePostHog } from 'posthog-js/react'
import { useAccount } from 'wagmi'
import { AccountMenuItem } from './AccountMenuItem'

// Dynamically import the MobileSidebar component with SSR disabled
const DynamicMobileSidebar = dynamic(
  () =>
    import('@offchainlabs/cobalt').then(mod => ({
      default: mod.MobileSidebar
    })),
  { ssr: false }
)

export const AppMobileSidebar: React.FC<React.PropsWithChildren> = () => {
  const posthog = usePostHog()
  const { isConnected } = useAccount()

  return (
    <div className="flex flex-col justify-center sm:hidden">
      <DynamicMobileSidebar logger={posthog} activeMenu="Bridge">
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
      </DynamicMobileSidebar>
    </div>
  )
}
