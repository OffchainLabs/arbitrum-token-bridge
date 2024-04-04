'use client'
import { MobileSidebar } from '@offchainlabs/cobalt'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePostHog } from 'posthog-js/react'
import { HeaderConnectWalletButton } from '../common/HeaderConnectWalletButton'

// Dynamically import the MobileSidebar component with SSR disabled
const DynamicMobileSidebar = dynamic(
  () =>
    import('@offchainlabs/cobalt').then(mod => ({
      default: mod.MobileSidebar
    })),
  { ssr: false }
)

export const AppMobileSidebar = ({ children }: any) => {
  const posthog = usePostHog()
  return (
    <DynamicMobileSidebar logger={posthog} activeMenu="Bridge">
      {children}
    </DynamicMobileSidebar>
  )
}
