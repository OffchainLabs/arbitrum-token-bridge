'use client'

import arbitrumStatusJson from '../../../public/__auto-generated-status.json'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useLocalStorage } from '@uidotdev/usehooks'
import { createHash } from 'crypto'

type ArbitrumStatusResponse = {
  meta: {
    timestamp: string
  }
  content: {
    page?: {
      name: string
      url: string
      status: string
    }
    activeIncidents?: {
      name: string
      started: string
      status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED'
      impact: string
      url: string
    }[]
    activeMaintenances?: {
      name: string
      start: string
      status: string
      duration: string
      url: string
    }[]
  }
}

const arbitrumStatus = (arbitrumStatusJson as ArbitrumStatusResponse).content

export const generateMessageKey = (message: string) => {
  return createHash('md5')
    .update(message.toLowerCase().replaceAll(' ', '-'))
    .digest('hex')
}

type BannerConfig = {
  hideIncidentBanner: string | boolean
  hideInfoBanner: string | boolean
}

export const SiteBannerClient = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const activeIncidentMessage = arbitrumStatus.activeIncidents?.[0]?.name
  const activeIncidentMessageKey = generateMessageKey(
    activeIncidentMessage ?? ''
  )

  const infoMessage = children?.toString() ?? ''
  const infoMessageKey = generateMessageKey(infoMessage)

  const [bannerConfig, setBannerConfig] = useLocalStorage<BannerConfig>(
    'arbitrum:bridge:banner',
    {
      hideIncidentBanner: false,
      hideInfoBanner: false
    }
  )

  const { hideIncidentBanner, hideInfoBanner } = bannerConfig
  const showIncidentBanner = !hideIncidentBanner
  const showInfoBanner = !hideInfoBanner
  const showBanner = showIncidentBanner || showInfoBanner

  const closeBanner = () => {
    // if incident banner is showing then set it as false, which will reveal info-banner
    if (showIncidentBanner) {
      setBannerConfig(prevBannerConfig => ({
        ...prevBannerConfig,
        hideIncidentBanner: activeIncidentMessageKey
      }))
      return
    }

    // else set info banner as false
    setBannerConfig(prevBannerConfig => ({
      ...prevBannerConfig,
      hideInfoBanner: infoMessageKey
    }))
  }

  return (
    <>
      {showBanner && (
        <div
          className="flex w-full items-center justify-center whitespace-nowrap bg-atmosphere-blue px-4 py-[8px] text-center text-sm font-normal text-white"
          {...props}
        >
          <div className="w-full">
            {showIncidentBanner ? activeIncidentMessage : children}
          </div>

          <XMarkIcon
            width={18}
            className="cursor-pointer justify-end"
            onClick={closeBanner}
          />
        </div>
      )}
    </>
  )
}
