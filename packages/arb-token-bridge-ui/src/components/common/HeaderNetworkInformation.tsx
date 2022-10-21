import { useMemo } from 'react'

import EthereumLogo from '../../assets/EthereumLogo.png'
import ArbitrumOneLogo from '../../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../../assets/ArbitrumNovaLogo.png'

import { getNetworkName, isNetwork } from '../../util/networks'
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
    <div className="flex w-max flex-row items-center justify-center space-x-3 rounded-full px-4 py-3 lg:bg-dark lg:py-2">
      <img
        src={logoSrc}
        alt={`${networkName} logo`}
        className="max-w-8 max-h-8"
      />
      <span className="text-2xl font-medium text-white lg:text-base lg:font-normal">
        {networkName}
      </span>
    </div>
  )
}
