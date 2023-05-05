import {
  ChevronDownIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

export function HeaderNetworkNotSupported() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center justify-start space-x-2 rounded-full py-4 text-white lg:justify-center lg:bg-brick-dark lg:px-4">
        <ExclamationCircleIcon className="h-6 w-6  text-brick lg:text-white" />
        <span className="text-2xl text-brick lg:text-base">Wrong network</span>
        <ChevronDownIcon className="h-4 w-4" />
      </div>
      <span className="pl-11 text-left text-sm text-brick lg:hidden lg:text-center">
        Please change your network in your wallet to either Mainnet or Arbitrum
      </span>
    </div>
  )
}
