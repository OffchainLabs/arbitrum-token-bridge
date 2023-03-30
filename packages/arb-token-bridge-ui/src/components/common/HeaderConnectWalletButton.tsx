import { PlusCircleIcon } from '@heroicons/react/outline'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { HeaderAccountPopover } from './HeaderAccountPopover'
import { HeaderNetworkInformation } from './HeaderNetworkInformation'
import { NetworkSelectionContainer } from './NetworkSelectionContainer'

export function HeaderConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none'
              }
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="arb-hover flex w-full flex-row items-center bg-lime-dark py-3 px-6 text-2xl font-medium text-white lg:rounded-full lg:bg-lime-dark lg:py-2 lg:px-4 lg:text-base lg:font-normal"
                  >
                    <PlusCircleIcon className="mr-3 h-10 w-10 rounded-full bg-white stroke-lime-dark p-1 opacity-40" />
                    Connect Wallet
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="arb-hover flex w-full flex-row items-center bg-lime-dark bg-[#FF494A] py-3 px-6 text-2xl font-medium text-white lg:rounded-full lg:py-2 lg:px-4 lg:text-base lg:font-normal"
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <div className="flex gap-3">
                  <NetworkSelectionContainer>
                    <HeaderNetworkInformation />
                  </NetworkSelectionContainer>
                  <HeaderAccountPopover />
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
