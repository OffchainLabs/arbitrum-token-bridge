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

const shuffleArray = (array: PortalProject[]) => {
  return array.sort(() => Math.random() - 0.5)
}

const fetchProjects = async (chainId: number) => {
  const isChainOrbit = isNetwork(chainId).isOrbitChain
  const chainSlug = getChainQueryParamForChain(chainId)

  if (!isChainOrbit || !chainSlug) {
    return []
  }

  const response = await axios.get(
    `${PORTAL_API_ENDPOINT}/api/projects?chains=${chainSlug}`
  )

  return response.data as PortalProject[]
}

export const ProjectsListing = () => {
  const [{ destinationChain }] = useNetworks()

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
    isDestinationChainOrbit ? [destinationChain.id, 'fetchProjects'] : null,
    ([destinationChainId]) => fetchProjects(destinationChainId)
  )

  if (
    isLoading ||
    !projects ||
    projects.length === 0 ||
    typeof error !== 'undefined'
  ) {
    return null
  }

  // Shuffle projects and limit to 4
  const randomizedProjects = shuffleArray(projects).slice(0, 4)

  return (
    <div
      className="flex flex-col gap-3 rounded-md border bg-dark p-4 text-white"
      style={{
        borderColor: destinationChainUIcolor
      }}
    >
      <h2 className="text-lg">
        Explore Apps on {getNetworkName(destinationChain.id)}
      </h2>
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
        {randomizedProjects.map(project => (
          <Project
            key={project.id}
            project={project}
            onClick={() => {
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
          href={`${PORTAL_API_ENDPOINT}/projects?chains=${destinationChainSlug}`}
          className="flex w-min flex-nowrap items-center gap-2 self-end whitespace-nowrap rounded-sm border p-2 text-sm"
          style={{
            borderColor: destinationChainUIcolor,
            backgroundColor: `${destinationChainUIcolor}66`
          }}
          onClick={() => {
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
