import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { ExternalLink } from './ExternalLink'
import { ArbitrumStatusResponse } from '../../pages/api/status'
import { getAPIBaseUrl } from '../../util'

dayjs.extend(utc)

const SiteBannerArbiscanIncident = ({
  type
}: {
  type: 'arbitrum-one' | 'arbitrum-nova'
}) => {
  const chainName = type === 'arbitrum-one' ? 'Arbitrum One' : 'Arbitrum Nova'
  const explorerUrl =
    type === 'arbitrum-nova'
      ? 'https://nova.arbiscan.io/'
      : 'https://arbiscan.io/'
  const explorerTitle = type === 'arbitrum-nova' ? 'Nova Arbiscan' : 'Arbiscan'
  const alternativeExplorerUrl =
    type === 'arbitrum-nova' ? '' : 'https://www.oklink.com/arbitrum'

  return (
    <div className="bg-orange-dark px-4 py-[8px] text-center text-sm font-normal text-white">
      <div className="w-full">
        <p>
          <ExternalLink className="underline" href={explorerUrl}>
            {explorerTitle}
          </ExternalLink>{' '}
          is temporarily facing some issues while showing the latest data.{' '}
          {chainName} is still live and running.{' '}
          {alternativeExplorerUrl ? (
            <>
              If you need an alternative block explorer, you can visit{' '}
              <ExternalLink className="underline" href={alternativeExplorerUrl}>
                here
              </ExternalLink>
              .
            </>
          ) : null}
        </p>
      </div>
    </div>
  )
}

function isComponentArbiscanOne({ name }: { name: string }) {
  const componentNameLowercased = name.toLowerCase()
  return componentNameLowercased === 'arb1 - arbiscan'
}

function isComponentArbiscanNova({ name }: { name: string }) {
  const componentNameLowercased = name.toLowerCase()
  return componentNameLowercased === 'nova - arbiscan'
}

function isComponentOperational({ status }: { status: string }) {
  return status === 'OPERATIONAL'
}

export const SiteBanner = ({
  children,
  expiryDate, // date in utc
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
  const showArbiscanOneIncidentBanner = arbitrumStatus.content.components.some(
    component =>
      isComponentArbiscanOne(component) && !isComponentOperational(component)
  )
  const showArbiscanNovaIncidentBanner = arbitrumStatus.content.components.some(
    component =>
      isComponentArbiscanNova(component) && !isComponentOperational(component)
  )

  // show info-banner till expiry date if provided
  const showInfoBanner =
    !expiryDate ||
    (expiryDate && dayjs.utc().isBefore(dayjs(expiryDate).utc(true)))

  // arbiscan banner always takes priority
  if (showArbiscanOneIncidentBanner || showArbiscanNovaIncidentBanner) {
    return (
      <SiteBannerArbiscanIncident
        type={showArbiscanOneIncidentBanner ? 'arbitrum-one' : 'arbitrum-nova'}
      />
    )
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
