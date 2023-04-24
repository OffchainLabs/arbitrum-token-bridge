import { ChevronDownIcon } from '@heroicons/react/outline'
import Image from 'next/image'
import { useNetwork } from 'wagmi'

import { getNetworkLogo, getNetworkName } from '../../util/networks'

export function HeaderNetworkInformation() {
  const { chain } = useNetwork()

  if (!chain || chain.unsupported) {
    return null
  }

  const networkName = getNetworkName(chain.id)

  return (
    <div
      className="flex w-max flex-row items-center justify-center space-x-3 rounded-full text-white lg:bg-dark lg:px-4 lg:py-2 "
      aria-label={`Selected Network : ${networkName}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full">
        <Image
          src={getNetworkLogo(chain.id)}
          alt={`${networkName} logo`}
          className="h-full w-auto"
          width={40}
          height={40}
        />
      </div>

      <span className="text-2xl font-medium lg:text-base lg:font-normal">
        {networkName}
      </span>

      <ChevronDownIcon className="h-4 w-4" />
    </div>
  )
}
