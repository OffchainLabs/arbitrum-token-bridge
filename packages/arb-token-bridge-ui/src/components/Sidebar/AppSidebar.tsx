'use client'
import dynamic from 'next/dynamic'
import { usePostHog } from 'posthog-js/react'

// Dynamically import the Sidebar component with SSR disabled
const DynamicSidebar = dynamic(
  () => import('@offchainlabs/cobalt').then(mod => ({ default: mod.Sidebar })),
  { ssr: false }
)

export const AppSidebar = () => {
  const posthog = usePostHog()
  return (
    <div className="sticky top-0 z-20 hidden h-full font-normal sm:flex">
      <DynamicSidebar logger={posthog} activeMenu="Bridge" />
    </div>
  )
}
