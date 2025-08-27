import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { ExternalLink } from './ExternalLink'
import { ArbitrumStatusResponse } from '@/bridge/app/api/status'
import { getAPIBaseUrl } from '../../util'

const SiteBannerArbiscanIncident = ({
  type
}: {
  type: 'arbitrum-one' | 'arbitrum-nova'
}) => {
  const isArbitrumOne = type === 'arbitrum-one'

  const chainName = isArbitrumOne ? 'Arbitrum One' : 'Arbitrum Nova'
  const explorerUrl = isArbitrumOne
    ? 'https://arbiscan.io/'
    : 'https://nova.arbiscan.io/'
  const explorerTitle = isArbitrumOne ? 'Arbiscan' : 'Nova Arbiscan'
  const alternativeExplorerUrl = isArbitrumOne
    ? 'https://www.oklink.com/arbitrum'
    : false

  return (
    <div className="bg-orange-dark px-4 py-[8px] text-center text-sm font-normal text-white">
      <div className="w-full">
        <p>
          <ExternalLink className="arb-hover underline" href={explorerUrl}>
            {explorerTitle}
          </ExternalLink>{' '}
          is temporarily facing some issues while showing the latest data.{' '}
          {chainName} is still live and running.{' '}
          {alternativeExplorerUrl ? (
            <>
              If you need an alternative block explorer, you can visit{' '}
              <ExternalLink
                className="arb-hover underline"
                href={alternativeExplorerUrl}
              >
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
    !!children &&
    (!expiryDate ||
      (expiryDate && dayjs.utc().isBefore(dayjs(expiryDate).utc(true))))

  if (showArbiscanOneIncidentBanner) {
    return <SiteBannerArbiscanIncident type="arbitrum-one" />
  }

  if (showArbiscanNovaIncidentBanner) {
    return <SiteBannerArbiscanIncident type="arbitrum-nova" />
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
