import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { twMerge } from 'tailwind-merge'

export function HeaderConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <div className="w-full px-4 sm:px-0">
          <button
            onClick={openConnectModal}
            type="button"
            className={twMerge(
              'arb-hover flex w-full flex-row items-center bg-lime-dark px-2 py-2 text-white',
              'sm:rounded sm:bg-lime-dark sm:px-3 sm:py-1 sm:text-base sm:font-normal'
            )}
          >
            <PlusCircleIcon className="mr-3 h-6 w-6 stroke-1 sm:h-8 sm:w-8" />
            Connect Wallet
          </button>
        </div>
      )}
    </ConnectButton.Custom>
  )
}
