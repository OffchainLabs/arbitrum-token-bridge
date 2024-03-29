import { useEffect, useState } from 'react'
import { ExternalLink } from './ExternalLink'
import { ArbitrumStatusResponse } from '../../pages/api/status'
import { getAPIBaseUrl } from '../../util'
import {
  getCurrentDateInEasternTime,
  parseDateInEasternTime
} from '../../util/DateUtils'

const SiteBannerArbiscanIncident = () => {
  return (
    <div className="bg-orange-dark px-4 py-[8px] text-center text-sm font-normal text-white">
      <div className="w-full">
        <p>
          <ExternalLink className="underline" href="https://arbiscan.io/">
            Arbiscan
          </ExternalLink>{' '}
          is temporarily facing some issues while showing the latest data.
          Arbitrum chains are still live and running. If you need an alternative
          block explorer, you can visit{' '}
          <ExternalLink
            className="underline"
            href="https://www.oklink.com/arbitrum"
          >
            OKLink
          </ExternalLink>
          .
        </p>
      </div>
    </div>
  )
}

function isComponentArbiscan({ name }: { name: string }) {
  const componentNameLowercased = name.toLowerCase()
  return (
    componentNameLowercased === 'arb1 - arbiscan' ||
    componentNameLowercased === 'nova - arbiscan'
  )
}

function isComponentOperational({ status }: { status: string }) {
  return status === 'OPERATIONAL'
}

export const SiteBanner = ({
  children,
  expiryDate, // date in Eastern time
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { expiryDate?: string }) => {
  const [arbitrumStatus, setArbitrumStatus] = useState<ArbitrumStatusResponse>({
    content: { components: [] }
  })

  useEffect(() => {
    const updateArbitrumStatus = async () => {
      try {
        const response = await fetch(`${getAPIBaseUrl()}/api/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        setArbitrumStatus(
          (await response.json()).data as ArbitrumStatusResponse
        )
      } catch (e) {
        // error fetching status
        console.error(e)
      }
    }
    updateArbitrumStatus()
  }, [])

  // show incident-banner if there is an active incident
  const showArbiscanIncidentBanner = arbitrumStatus.content.components.some(
    component =>
      isComponentArbiscan(component) && !isComponentOperational(component)
  )

  // show info-banner till expiry date if provided
  const showInfoBanner =
    !expiryDate ||
    (expiryDate &&
      getCurrentDateInEasternTime().isBefore(
        parseDateInEasternTime(expiryDate)
      ))

  // arbiscan banner always takes priority
  if (showArbiscanIncidentBanner) {
    return <SiteBannerArbiscanIncident />
  }

  if (!showInfoBanner) {
    return null
  }

  return (
    <div
      className="bg-gradientCelebration px-4 py-[8px] text-center text-sm font-normal text-white"
      {...props}
    >
      <div className="w-full">{children}</div>
    </div>
  )
}
