import { usePostHog } from 'posthog-js/react'
import { Sidebar } from '@offchainlabs/cobalt'

export const AppSidebar = () => {
  const posthog = usePostHog()
  return (
    <div className="sticky left-0 top-0 z-20 hidden h-full font-normal sm:flex">
      <Sidebar logger={posthog} activeMenu="Bridge" />
    </div>
  )
}
