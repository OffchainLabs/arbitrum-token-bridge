'use client'
import { Sidebar } from '@offchainlabs/cobalt'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePostHog } from 'posthog-js/react'

// Dynamically import the Sidebar component with SSR disabled
const DynamicSidebar = dynamic(
  () => import('@offchainlabs/cobalt').then(mod => ({ default: mod.Sidebar })),
  { ssr: false }
)

export const AppSidebar = () => {
  const posthog = usePostHog()
  return (
    <div className="sm:hidden">
      <DynamicSidebar logger={posthog} activeMenu="Bridge" />
    </div>
  )
}
