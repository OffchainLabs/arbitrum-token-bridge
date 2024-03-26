import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import arbitrumStatusJson from '../../../public/__auto-generated-status.json'
import { ExternalLink } from './ExternalLink'

type ArbitrumStatusResponse = {
  meta: {
    timestamp: string
  }
  content: {
    components?: {
      id: string
      name: string
      description: string
      status:
        | 'UNDERMAINTENANCE'
        | 'OPERATIONAL'
        | 'DEGRADEDPERFORMANCE'
        | 'PARTIALOUTAGE'
        | 'MAJOROUTAGE'
    }[]
  }
}

const arbitrumStatus = (arbitrumStatusJson as ArbitrumStatusResponse).content

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
  // show incident-banner if there is an active incident
  const showArbiscanIncidentBanner =
    (arbitrumStatus.components || []).findIndex(
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
