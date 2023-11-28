import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'

import { getNetworkLogo, getNetworkName, isNetwork } from '../../util/networks'
import { useAccountType } from '../../hooks/useAccountType'
import { useNetworks } from '../../hooks/useNetworks'

export function HeaderNetworkInformation() {
  const [{ sourceChain }] = useNetworks()
  const { isSmartContractWallet } = useAccountType()

  const networkName = getNetworkName(sourceChain.id)

  return (
    <div
      className="flex w-max flex-row items-center justify-center space-x-3 rounded-full text-white lg:bg-dark lg:px-4 lg:py-2 "
      aria-label={`Selected Network : ${networkName}`}
    >
      <div
        className={twMerge(
          'flex h-10 w-10 items-center justify-center rounded-full lg:bg-transparent lg:p-0',
          isNetwork(sourceChain.id).isEthereumMainnetOrTestnet
            ? 'bg-[rgba(162,170,240,0.5)] p-1'
            : ''
        )}
      >
        <Image
          src={getNetworkLogo(sourceChain.id, 'light')}
          alt={`${networkName} logo`}
          className="h-full w-auto"
          width={40}
          height={40}
        />
      </div>

      <span
        className={twMerge(
          'max-w-[200px] truncate text-2xl font-medium lg:text-base lg:font-normal',
          isSmartContractWallet ? 'pr-2' : ''
        )}
      >
        {networkName}
      </span>

      {!isSmartContractWallet && <ChevronDownIcon className="h-4 w-4" />}
    </div>
  )
}
