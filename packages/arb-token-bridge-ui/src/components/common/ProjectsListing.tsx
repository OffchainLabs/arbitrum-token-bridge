import { useMemo } from 'react'
import axios from 'axios'
import useSWRImmutable from 'swr/immutable'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { useNetworks } from '../../hooks/useNetworks'
import { getNetworkName, isNetwork } from '../../util/networks'
import { PortalProject, Project } from './PortalProject'
import { PORTAL_API_ENDPOINT } from '../../constants'
import { ExternalLink } from './ExternalLink'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'
import { getChainQueryParamForChain } from '../../types/ChainQueryParam'
import { trackEvent } from '../../util/AnalyticsUtils'
import { useIsTestnetMode } from '../../hooks/useIsTestnetMode'
import { isDevelopmentEnvironment } from '../../util/CommonUtils'

const shuffleArray = (array: PortalProject[]) => {
  return array.sort(() => Math.random() - 0.5)
}

const generateTestnetProjects = (
  chainId: number,
  count: number
): PortalProject[] => {
  const {
    network: { name: chainName, logo: chainImage }
  } = getBridgeUiConfigForChain(chainId)

  return [...Array(count)].map((_, key) => ({
    chains: [chainName],
    description: `This is a featured project deployed on ${chainName}.`,
    id: `project_${key}`,
    images: {
      logoUrl: chainImage,
      bannerUrl: chainImage
    },
    subcategories: [
      { id: 'defi', title: 'Defi' },
      { id: 'nfts', title: 'NFTs' }
    ],
    title: `Featured Project ${key + 1}`,
    url: PORTAL_API_ENDPOINT
  }))
}

const fetchProjects = async (
  chainId: number,
  isTestnetMode: boolean
): Promise<PortalProject[]> => {
  const isChainOrbit = isNetwork(chainId).isOrbitChain
  const chainSlug = getChainQueryParamForChain(chainId)

  if (!isChainOrbit || !chainSlug) {
    return []
  }

  if (isTestnetMode) {
    return isDevelopmentEnvironment ? generateTestnetProjects(chainId, 6) : [] // don't show any test projects in production
  }

  try {
    const response = await axios.get(
      `${PORTAL_API_ENDPOINT}/api/projects?chains=${chainSlug}`
    )
    return response.data as PortalProject[]
  } catch (error) {
    console.warn('Error fetching projects:', error)
    return []
  }
}

export const ProjectsListing = () => {
  const [{ destinationChain }] = useNetworks()
  const [isTestnetMode] = useIsTestnetMode()

  const isDestinationChainOrbit = isNetwork(destinationChain.id).isOrbitChain
  const { color: destinationChainUIcolor } = getBridgeUiConfigForChain(
    destinationChain.id
  )
  const destinationChainSlug = getChainQueryParamForChain(destinationChain.id)

  const {
    data: projects,
    error,
    isLoading
  } = useSWRImmutable(
    isDestinationChainOrbit
      ? [destinationChain.id, isTestnetMode, 'fetchProjects']
      : null,
    ([destinationChainId, isTestnetMode]) =>
      fetchProjects(destinationChainId, isTestnetMode)
  )

  // Shuffle projects and limit to 4
  const randomizedProjects = useMemo(
    () => (projects ? shuffleArray(projects).slice(0, 4) : []),
    [projects]
  )

  if (
    isLoading ||
    !projects ||
    projects.length === 0 ||
    typeof error !== 'undefined'
  ) {
    return null
  }

  return (
    <div
      className="flex flex-col gap-3 border-y bg-dark p-4 text-white sm:rounded-md sm:border"
      style={{
        borderColor: destinationChainUIcolor
      }}
    >
      <h2 className="text-lg">
        Explore Apps on {getNetworkName(destinationChain.id)}
      </h2>

      {isTestnetMode && (
        <div className="text-xs text-white/70">
          <b>Development-mode only</b>. These are placeholder projects for
          showing how this feature works in non-production mode. Real projects
          are fetched from the Portal for mainnet Orbit chains.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
        {randomizedProjects.map(project => (
          <Project
            key={project.id}
            project={project}
            isTestnetMode={isTestnetMode}
            onClick={() => {
              if (isTestnetMode) return

              trackEvent('Project Click', {
                network: getNetworkName(destinationChain.id),
                projectName: project.title
              })
            }}
          />
        ))}
      </div>
      {projects.length > 4 && (
        <ExternalLink
          href={
            isTestnetMode
              ? PORTAL_API_ENDPOINT
              : `${PORTAL_API_ENDPOINT}/projects?chains=${destinationChainSlug}`
          }
          className="flex w-min flex-nowrap items-center gap-2 self-end whitespace-nowrap rounded-md border p-2 text-sm"
          style={{
            borderColor: destinationChainUIcolor,
            backgroundColor: `${destinationChainUIcolor}66`
          }}
          onClick={() => {
            if (isTestnetMode) return

            trackEvent('Show All Projects Click', {
              network: getNetworkName(destinationChain.id)
            })
          }}
        >
          See all
          <ChevronRightIcon className="h-3 w-3" />
        </ExternalLink>
      )}
    </div>
  )
}
