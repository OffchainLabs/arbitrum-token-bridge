import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ExternalLink } from './ExternalLink'
import { ArbitrumStatusResponse } from '../../pages/api/status'
import { getAPIBaseUrl } from '../../util'

const generateArbiscanIncidentMessage = () => {
  return (
    <p>
      <ExternalLink className="underline" href="https://arbiscan.io/">
        Arbiscan
      </ExternalLink>{' '}
      is temporarily facing some issues while showing the latest data. Arbitrum
      chains are still live and running. If you need an alternative block
      explorer, you can visit{' '}
      <ExternalLink
        className="underline"
        href="https://www.oklink.com/arbitrum"
      >
        OKLink
      </ExternalLink>
      .
    </p>
  )
}

export const SiteBanner = ({
  children,
  expiryDate,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { expiryDate?: string }) => {
  const [arbitrumStatus, setArbitrumStatus] = useState<
    ArbitrumStatusResponse | undefined
  >()

  useEffect(() => {
    const fetchSetArbitrumStatus = async () => {
      try {
        const response = await fetch(`${getAPIBaseUrl()}/api/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        const _arbitrumStatus: ArbitrumStatusResponse = (await response.json())
          .data
        setArbitrumStatus(_arbitrumStatus)
      } catch (e) {
        // error fetching status
        console.error(e)
      }
    }
    fetchSetArbitrumStatus()
  }, [])

  // show incident-banner if there is an active incident
  const showArbiscanIncidentBanner =
    (arbitrumStatus?.content.components || []).findIndex(
      component =>
        component.name.toLowerCase().includes('arbiscan') &&
        component.status !== 'OPERATIONAL'
    ) > -1

  // show info-banner till expiry date if provided
  const showInfoBanner =
    !expiryDate || (expiryDate && dayjs().isBefore(dayjs(expiryDate)))

  // show banner only if we have an active incident or active info banner
  const showBanner = showArbiscanIncidentBanner || showInfoBanner

  return (
    <>
      {showBanner && (
        <div
          className={twMerge(
            'px-4 py-[8px] text-center text-sm font-normal text-white',
            showArbiscanIncidentBanner
              ? 'bg-orange-dark'
              : 'bg-gradientCelebration'
          )}
          {...props}
        >
          <div className="w-full">
            {/* incident banner always takes precedence over info banner */}
            {showArbiscanIncidentBanner
              ? generateArbiscanIncidentMessage()
              : children}
          </div>
        </div>
      )}
    </>
  )
}

export function SiteBannerArbiscanIncident() {
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
