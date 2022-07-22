import { InformationCircleIcon } from '@heroicons/react/outline'

export function HeaderNetworkNotSupported() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center space-x-3 rounded-full px-4 py-3 lg:bg-brick-dark">
        <InformationCircleIcon className="h-6 w-6 text-brick lg:text-white" />
        <span className="text-2xl text-brick lg:text-base lg:text-white">
          Wrong network
        </span>
      </div>
      <span className="max-w-64 text-center text-sm text-brick lg:hidden">
        Please change your network in your wallet to either Mainnet or Arbitrum
      </span>
    </div>
  )
}
