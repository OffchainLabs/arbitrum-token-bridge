import { ChevronDownIcon } from '@heroicons/react/outline'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import { useNetwork } from 'wagmi'

import { getNetworkLogo, isNetwork } from '../../util/networks'

export function HeaderNetworkInformation() {
  const { chain } = useNetwork()

  if (!chain || chain.unsupported) {
    return null
  }

  return (
    <div
      className="flex w-max flex-row items-center justify-center space-x-3 rounded-full text-white lg:bg-dark lg:px-4 lg:py-2 "
      aria-label={`Selected Network : ${chain.name}`}
    >
      <div
        className={twMerge(
          'flex h-10 w-10 items-center justify-center rounded-full',
          isNetwork(chain.id).isEthereum ? 'bg-[rgba(162,170,240,0.5)]' : ''
        )}
      >
        <Image
          src={getNetworkLogo(chain.id)}
          alt={`${chain.name} logo`}
          className="h-full w-auto"
        />
      </div>

      <span className="text-2xl font-medium lg:text-base lg:font-normal">
        {chain.name}
      </span>

      <ChevronDownIcon className="h-4 w-4" />
    </div>
  )
}
