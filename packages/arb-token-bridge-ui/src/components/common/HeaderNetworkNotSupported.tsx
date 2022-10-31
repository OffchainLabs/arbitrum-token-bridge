import {
  ChevronDownIcon,
  InformationCircleIcon
} from '@heroicons/react/outline'

export function HeaderNetworkNotSupported() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center justify-center space-x-3 rounded-full px-4 py-3 text-white lg:bg-brick-dark">
        <InformationCircleIcon className="h-6 w-6 text-brick lg:text-white" />
        <span className="text-2xl text-brick lg:text-base">Wrong network</span>
        <ChevronDownIcon className="h-4 w-4" />
      </div>
      <span className="max-w-64 p-2 text-center text-sm text-brick lg:hidden">
        Please change your network in your wallet to either Mainnet or Arbitrum
      </span>
    </div>
  )
}
