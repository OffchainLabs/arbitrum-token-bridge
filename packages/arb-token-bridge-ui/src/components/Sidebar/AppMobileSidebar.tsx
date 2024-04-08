'use client'
import dynamic from 'next/dynamic'
import { usePostHog } from 'posthog-js/react'

// Dynamically import the MobileSidebar component with SSR disabled
const DynamicMobileSidebar = dynamic(
  () =>
    import('@offchainlabs/cobalt').then(mod => ({
      default: mod.MobileSidebar
    })),
  { ssr: false }
)

export const AppMobileSidebar: React.FC<React.PropsWithChildren> = ({
  children
}) => {
  const posthog = usePostHog()
  return (
    <div className="sm:hidden">
      <DynamicMobileSidebar logger={posthog} activeMenu="Bridge">
        {children}
      </DynamicMobileSidebar>
    </div>
  )
}
