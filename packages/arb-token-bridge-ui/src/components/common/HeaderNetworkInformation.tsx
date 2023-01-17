import { useMemo } from 'react'

import EthereumLogo from '../../assets/EthereumLogo.webp'
import ArbitrumOneLogo from '../../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../../assets/ArbitrumNovaLogo.webp'

import { getNetworkName, isNetwork } from '../../util/networks'
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

  const logoSrc = useMemo(() => {
    const { isArbitrum, isArbitrumNova } = isNetwork(network.chainID)

    if (!isArbitrum) {
      return EthereumLogo
    }

    if (isArbitrumNova) {
      return ArbitrumNovaLogo
    }

    return ArbitrumOneLogo
  }, [network])

  const networkName = getNetworkName(network.chainID)

  return (
    <div
      className="flex w-max flex-row items-center justify-center space-x-3 rounded-full text-white lg:bg-dark lg:px-4 lg:py-2"
      aria-label={`Selected Network : ${networkName}`}
    >
      <div className="flex h-8 w-8 items-center justify-center">
        <img
          src={logoSrc}
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
