import { useState, useEffect } from 'react'
import { SiteBannerClient } from './SiteBannerClient'

export const SiteBanner = () => {
  const [initializeBanner, setInitializeBanner] = useState(false)

  useEffect(() => {
    setInitializeBanner(true)
  }, [])

  if (!initializeBanner) return null

  return (
    <SiteBannerClient>The Arbitrum Bridge has a new look!</SiteBannerClient>
  )
}
