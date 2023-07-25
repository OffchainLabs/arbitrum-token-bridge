import useLocalStorage from '@rehooks/local-storage'
import Image from 'next/image'
import {
  StarIcon as StarIconOutline,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { usePostHog } from 'posthog-js/react'

import { ExternalLink } from './ExternalLink'
import {
  NonCanonicalTokenNames,
  FastBridgeInfo,
  FastBridgeNames,
  SpecialTokenSymbol
} from '../../util/fastBridges'

export function BridgesTable(props: {
  bridgeList: FastBridgeInfo[]
  selectedNonCanonicalToken?: NonCanonicalTokenNames | SpecialTokenSymbol.USDC
}) {
  const posthog = usePostHog()
  const [favorites, setFavorites] = useLocalStorage<string[]>(
    'arbitrum:bridge:favorite-fast-bridges',
    []
  )

  function onClick(bridgeName: FastBridgeNames) {
    if (props.selectedNonCanonicalToken) {
      posthog?.capture('Fast Bridge Click', {
        bridge: bridgeName,
        tokenSymbol: props.selectedNonCanonicalToken
      })
    } else {
      posthog?.capture('Fast Bridge Click', { bridge: bridgeName })
    }
  }

  function isFavorite(bridgeName: FastBridgeNames) {
    return favorites.includes(bridgeName)
  }

  function toggleFavorite(bridgeName: FastBridgeNames) {
    if (favorites.includes(bridgeName)) {
      setFavorites(favorites.filter(favorite => favorite !== bridgeName))
    } else {
      setFavorites([...favorites, bridgeName])
    }
  }

  const sortedFastBridges = props.bridgeList.sort((a, b) => {
    const isFavoriteA = isFavorite(a.name)
    const isFavoriteB = isFavorite(b.name)

    if (isFavoriteA && !isFavoriteB) {
      return -1
    } else if (!isFavoriteA && isFavoriteB) {
      return 1
    }

    if (a.name < b.name) {
      return -1
    } else {
      return 1
    }
  })

  return (
    <table className="w-full border border-gray-3">
      <thead className="bg-gray-1 text-left">
        <tr className="text-gray-6">
          <th className="w-1/6 px-6 py-4 font-normal">Favorite</th>
          <th className="w-4/6 px-6 py-4 font-normal">Exchange</th>
          <th className="w-1/6 px-6 py-4 font-normal"></th>
        </tr>
      </thead>
      <tbody className="font-light">
        {sortedFastBridges.map(bridge => (
          <tr
            key={bridge.name}
            className="cursor-pointer border border-gray-3 hover:bg-cyan"
          >
            <td>
              <ExternalLink
                href={bridge.href}
                className="flex h-16 items-center px-6"
                onClick={() => onClick(bridge.name)}
              >
                <button
                  onClick={event => {
                    event.preventDefault()
                    toggleFavorite(bridge.name)
                  }}
                >
                  {isFavorite(bridge.name) ? (
                    <StarIconSolid className="h-6 w-6 text-ocl-blue" />
                  ) : (
                    <StarIconOutline className="h-6 w-6 text-ocl-blue" />
                  )}
                </button>
              </ExternalLink>
            </td>

            <td>
              <ExternalLink
                href={bridge.href}
                onClick={() => onClick(bridge.name)}
              >
                <div className="flex h-16 items-center space-x-4 px-6">
                  <Image
                    src={bridge.imageSrc}
                    alt={bridge.name}
                    className="bridge-logos h-8 w-8 rounded-full object-contain"
                    width={32}
                    height={32}
                  />
                  <span>{bridge.name}</span>
                </div>
              </ExternalLink>
            </td>

            <td>
              <ExternalLink
                href={bridge.href}
                className="arb-hover flex h-16 w-full items-center justify-center text-gray-4 hover:text-ocl-blue"
                onClick={() => onClick(bridge.name)}
              >
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              </ExternalLink>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
