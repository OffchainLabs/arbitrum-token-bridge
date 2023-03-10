import { useMemo } from 'react'

import { getNetworkLogo, getNetworkName } from '../../util/networks'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { ChevronDownIcon } from '@heroicons/react/outline'

export function HeaderNetworkInformation() {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network },
    isConnectedToArbitrum
  } = useNetworksAndSigners()

  const network = useMemo(
    () => (isConnectedToArbitrum ? l2Network : l1Network),
    [l1Network, l2Network, isConnectedToArbitrum]
  )

  const networkName = getNetworkName(network.chainID)

  return (
    <div
      className="flex w-max flex-row items-center justify-center space-x-3 rounded-full text-white lg:bg-dark lg:px-4 lg:py-2 "
      aria-label={`Selected Network : ${networkName}`}
    >
      <div className="flex h-8 w-8 items-center justify-center">
        <img
          src={getNetworkLogo(network.chainID)}
          alt={`${networkName} logo`}
          className="max-w-8 max-h-8"
        />
      </div>

      <span className="text-2xl font-medium  lg:text-base lg:font-normal">
        {networkName}
      </span>

      <ChevronDownIcon className="h-4 w-4" />
    </div>
  )
}
