import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { twJoin } from 'tailwind-merge'

import { HeaderAccountPopover } from './HeaderAccountPopover'

function NetworkButtonAndConnectButton({
  connected,
  openConnectModal
}: {
  connected: boolean
  openConnectModal: () => void
}) {
  if (!connected) {
    return (
      <button
        onClick={openConnectModal}
        type="button"
        className="arb-hover flex w-full flex-row items-center bg-lime-dark px-6 py-3 text-2xl font-medium text-white lg:rounded-full lg:bg-lime-dark lg:px-4 lg:py-2 lg:text-base lg:font-normal"
      >
        <PlusCircleIcon className="mr-3 h-10 w-10 rounded-full bg-white stroke-lime-dark p-1 opacity-40" />
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="flex gap-3">
      <HeaderAccountPopover />
    </div>
  )
}

function HeaderConnectWalletButtonWrapper({
  children,
  ready
}: {
  children: JSX.Element
  ready: boolean
}) {
  return (
    <div
      className={twJoin(!ready && 'pointer-events-none select-none opacity-0')}
      aria-hidden={!ready}
    >
      {children}
    </div>
  )
}

export function HeaderConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = !!(mounted && account && chain)

        return (
          <HeaderConnectWalletButtonWrapper ready={mounted}>
            <NetworkButtonAndConnectButton
              connected={connected}
              openConnectModal={openConnectModal}
            />
          </HeaderConnectWalletButtonWrapper>
        )
      }}
    </ConnectButton.Custom>
  )
}
