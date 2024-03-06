import useLocalStorage from '@rehooks/local-storage'
import Image from 'next/image'
import {
  StarIcon as StarIconOutline,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

import { ExternalLink } from './ExternalLink'
import {
  FastBridgeInfo,
  FastBridgeNames,
  SpecialTokenSymbol
} from '../../util/fastBridges'
import { trackEvent } from '../../util/AnalyticsUtils'

export function BridgesTable(props: {
  bridgeList: FastBridgeInfo[]
  selectedNonCanonicalToken?: SpecialTokenSymbol.USDC
}) {
  const [favorites, setFavorites] = useLocalStorage<string[]>(
    'arbitrum:bridge:favorite-fast-bridges',
    []
  )

  function onClick(bridgeName: FastBridgeNames) {
    if (props.selectedNonCanonicalToken) {
      trackEvent('Fast Bridge Click', {
        bridge: bridgeName,
        tokenSymbol: props.selectedNonCanonicalToken
      })
    } else {
      trackEvent('Fast Bridge Click', { bridge: bridgeName })
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
    <div className="rounded border border-gray-dark">
      <table className="w-full overflow-hidden rounded">
        <thead className="bg-black text-left">
          <tr className="text-white">
            <th className="w-1/5 px-5 py-4 font-normal">Favorite</th>
            <th className="px-5 py-4 font-normal">Bridge</th>
            <th className="px-5 py-4 font-normal"></th>
          </tr>
        </thead>
        <tbody className="font-light">
          {sortedFastBridges.map(bridge => (
            <tr
              key={bridge.name}
              className="cursor-pointer rounded border-t border-white bg-black transition duration-300 hover:bg-white/20"
            >
              <td>
                <ExternalLink
                  href={bridge.href}
                  className="flex items-center px-5 py-3"
                  onClick={() => onClick(bridge.name)}
                >
                  <button
                    onClick={event => {
                      event.preventDefault()
                      event.stopPropagation()
                      toggleFavorite(bridge.name)
                    }}
                    className="arb-hover"
                  >
                    {isFavorite(bridge.name) ? (
                      <StarIconSolid className="h-5 w-5 text-white" />
                    ) : (
                      <StarIconOutline className="h-5 w-5 text-white" />
                    )}
                  </button>
                </ExternalLink>
              </td>

              <td>
                <ExternalLink
                  href={bridge.href}
                  onClick={() => onClick(bridge.name)}
                >
                  <div className="flex items-center space-x-4 px-5 py-3">
                    <Image
                      src={bridge.imageSrc}
                      alt={bridge.name}
                      className="bridge-logos h-6 w-6 rounded-full object-contain"
                      width={32}
                      height={32}
                    />
                    <span className="text-sm">{bridge.name}</span>
                  </div>
                </ExternalLink>
              </td>

              <td>
                <ExternalLink
                  href={bridge.href}
                  className="arb-hover flex w-full items-center justify-end pr-5 text-gray-4"
                  onClick={() => onClick(bridge.name)}
                >
                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                </ExternalLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
