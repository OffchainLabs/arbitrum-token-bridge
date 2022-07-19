import { useMemo } from 'react'
import { useRouteMatch } from 'react-router-dom'
import { InformationCircleIcon } from '@heroicons/react/outline'
import Loader from 'react-loader-spinner'

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
  const isHomeRoute = useRouteMatch({ path: '/', exact: true })

  const network = useMemo(() => {
    if (status !== UseNetworksAndSignersStatus.CONNECTED) {
      return undefined
    }

    return isConnectedToArbitrum ? l2Network : l1Network
  }, [status, l1Network, l2Network, isConnectedToArbitrum])

  // TODO: The component shouldn't concern itself with which route it's on
  if (isHomeRoute === null) {
    return null
  }

  switch (status) {
    case UseNetworksAndSignersStatus.LOADING:
      return (
        <div className="rounded-full p-3 lg:bg-dark lg:p-2">
          <Loader type="TailSpin" height={32} width={32} color="white" />
        </div>
      )

    case UseNetworksAndSignersStatus.NOT_CONNECTED:
      return null

    case UseNetworksAndSignersStatus.NOT_SUPPORTED:
      return (
        <div className="flex flex-col">
          <div className="flex flex-row items-center space-x-3 rounded-full px-4 py-3 lg:bg-brick-dark">
            <InformationCircleIcon className="h-6 w-6 text-brick lg:text-white" />
            <span className="text-2xl text-brick lg:text-base lg:text-white">
              Wrong network
            </span>
          </div>
          <span className="max-w-64 text-center text-sm text-brick lg:hidden">
            Please change your network in your wallet to either Mainnet or
            Arbitrum
          </span>
        </div>
      )

    default:
      return (
        <div className="flex w-max flex-row items-center justify-center space-x-3 rounded-full px-4 py-3 lg:bg-dark lg:py-2">
          {isConnectedToArbitrum ? (
            <>
              <img
                src="/images/Arbitrum_Symbol_-_Full_color_-_White_background.svg"
                alt={network?.name}
                className="h-8"
              />
              <span className="text-2xl font-medium text-white lg:text-base lg:font-normal">
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
              <span className="text-2xl font-medium text-white lg:text-base lg:font-normal">
                {network?.name}
              </span>
            </>
          )}
        </div>
      )
  }
}
