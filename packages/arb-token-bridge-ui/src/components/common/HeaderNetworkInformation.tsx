import { useMemo } from 'react'
import { InformationCircleIcon } from '@heroicons/react/outline'

import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'

export function HeaderNetworkInformation() {
  const {
    status,
    l1: { network: l1Network },
    l2: { network: l2Network },
    isConnectedToArbitrum
  } = useNetworksAndSigners()

  const network = useMemo(() => {
    if (status !== UseNetworksAndSignersStatus.CONNECTED) {
      return undefined
    }

    return isConnectedToArbitrum ? l2Network : l1Network
  }, [status, l1Network, l2Network, isConnectedToArbitrum])

  switch (status) {
    case UseNetworksAndSignersStatus.NOT_CONNECTED:
      return null

    case UseNetworksAndSignersStatus.NOT_SUPPORTED:
      return (
        <div className="flex flex-col">
          <div className="flex flex-row items-center space-x-3 px-4 py-3 rounded-full lg:bg-v3-brick-dark">
            <InformationCircleIcon className="h-6 w-6 text-v3-brick lg:text-white" />
            <span className="text-2xl lg:text-base text-v3-brick lg:text-white">
              Wrong network
            </span>
          </div>
          <span className="text-sm text-center text-v3-brick max-w-64 lg:hidden">
            Please change your network in your wallet to either Mainnet or
            Arbitrum
          </span>
        </div>
      )

    default:
      return (
        <div className="w-full flex flex-row space-x-3 items-center justify-center px-3 py-3 lg:py-2 lg:bg-v3-dark rounded-full">
          {isConnectedToArbitrum ? (
            <>
              <img
                src="/images/Arbitrum_Symbol_-_Full_color_-_White_background.svg"
                alt={network?.name}
                className="h-8"
              />
              <span className="text-white text-2xl lg:text-base font-medium lg:font-normal">
                {network?.name}
              </span>
            </>
          ) : (
            <>
              <img
                src="/icons/ethereum.png"
                alt={network?.name}
                className="h-8"
              />
              <span className="text-white text-2xl lg:text-base font-medium lg:font-normal">
                {network?.name}
              </span>
            </>
          )}
        </div>
      )
  }
}
