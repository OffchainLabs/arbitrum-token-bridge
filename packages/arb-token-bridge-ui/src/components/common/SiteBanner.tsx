import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import arbitrumStatusJson from '../../../public/__auto-generated-status.json'

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

export const SiteBanner = ({
  children,
  expiryDate,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { expiryDate?: string }) => {
  const incidentMessage = arbitrumStatus.activeIncidents?.[0]?.name || ''

  // show incident-banner if there is an active incident
  const showIncidentBanner = !!incidentMessage.length

  // show info-banner till expiry date if provided
  const showInfoBanner =
    !expiryDate || (expiryDate && dayjs().isBefore(dayjs(expiryDate)))

  // show banner only if we have an active incident or active info banner
  const showBanner = showIncidentBanner || showInfoBanner

  return (
    <>
      {showBanner && (
        <div
          className={twMerge(
            'px-4 py-[8px] text-center text-sm font-normal text-white',
            showIncidentBanner ? 'bg-orange-dark' : 'bg-gradientCelebration'
          )}
          {...props}
        >
          <div className="w-full">
            {/* incident banner always takes precedence over info banner */}
            {showIncidentBanner ? incidentMessage : children}
          </div>
        </div>
      )}
    </>
  )
}
