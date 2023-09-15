import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'

import {
  ChainId,
  getNetworkLogo,
  getNetworkName,
  isNetwork
} from '../../util/networks'
import { useAccountType } from '../../hooks/useAccountType'

export function HeaderNetworkInformation({
  chainId = ChainId.Mainnet
}: {
  chainId: ChainId
}) {
  const { isSmartContractWallet } = useAccountType()

  const networkName = getNetworkName(chainId)

  return (
    <div
      className="flex w-max flex-row items-center justify-center space-x-3 rounded-full text-white lg:bg-dark lg:px-4 lg:py-2 "
      aria-label={`Selected Network : ${networkName}`}
    >
      <div
        className={twMerge(
          'flex h-10 w-10 items-center justify-center rounded-full lg:bg-transparent lg:p-0',
          isNetwork(chainId).isEthereum ? 'bg-[rgba(162,170,240,0.5)] p-1' : ''
        )}
      >
        <Image
          src={getNetworkLogo(chainId, 'light')}
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
