import { useMemo } from 'react'

import ArbitrumLogo from '../../assets/ArbitrumLogo.svg'
import EthereumLogo from '../../assets/EthereumLogo.png'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

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

  return (
    <div className="flex w-max flex-row items-center justify-center space-x-3 rounded-full px-4 py-3 lg:bg-dark lg:py-2">
      <img
        src={isConnectedToArbitrum ? ArbitrumLogo : EthereumLogo}
        alt={`${network.name} logo`}
        className="h-8"
      />
      <span className="text-2xl font-medium text-white lg:text-base lg:font-normal">
        {network.name}
      </span>
    </div>
  )
}
