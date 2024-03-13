import { useEffect, useState } from 'react'
import { HealthCheckResponse } from '../../pages/api/healthchecks'
import { getAPIBaseUrl } from '../../util'
import { ExternalLink } from '../common/ExternalLink'

const emptyHealthCheckResponse: HealthCheckResponse = { isArbiscanDown: false }

export async function getHealthChecksInfo() {
  try {
    const healthChecksResponse = await fetch(
      `${getAPIBaseUrl()}/api/healthchecks`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    )
    return (await healthChecksResponse.json()).data as HealthCheckResponse
  } catch (error) {
    console.error(error)
    return emptyHealthCheckResponse
  }
}

export const HealthChecksWarning = () => {
  const [healthchecksInfo, setHealthChecksInfo] = useState<HealthCheckResponse>(
    emptyHealthCheckResponse
  )

  useEffect(() => {
    async function _getSetHealthChecksInfo() {
      const info = await getHealthChecksInfo()
      if (info) {
        setHealthChecksInfo(info)
      }
    }
    _getSetHealthChecksInfo()
  }, [])

  return (
    <>
      {healthchecksInfo.isArbiscanDown && (
        <div className="mb-3 mt-0 w-full rounded-none border-x-0 border-white/30 bg-brick-dark p-3 text-left text-sm text-white sm:rounded sm:border">
          Arbiscan.io seems to be facing some issues. You can still use the
          Bridge, or the Arbitrum Network.{' '}
          <ExternalLink
            className="underline"
            href="https://status.arbitrum.io/"
          >
            {' '}
            Learn more
          </ExternalLink>
          .
        </div>
      )}
    </>
  )
}
