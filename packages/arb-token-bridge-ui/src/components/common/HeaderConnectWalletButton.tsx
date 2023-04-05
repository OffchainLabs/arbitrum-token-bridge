import { PlusCircleIcon } from '@heroicons/react/outline'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { HeaderAccountPopover } from './HeaderAccountPopover'
import { HeaderNetworkInformation } from './HeaderNetworkInformation'
import { NetworkSelectionContainer } from './NetworkSelectionContainer'

function NetworkButtonAndConnectButton({
  connected,
  chainUnsupported,
  openConnectModal,
  openChainModal
}: {
  connected: boolean
  chainUnsupported?: boolean
  openChainModal: () => void
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

  if (chainUnsupported) {
    return (
      <button
        onClick={openChainModal}
        type="button"
        className="arb-hover flex w-full flex-row items-center bg-[#FF494A] bg-lime-dark px-6 py-3 text-2xl font-medium text-white lg:rounded-full lg:px-4 lg:py-2 lg:text-base lg:font-normal"
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
      className={!ready ? 'pointer-events-none select-none opacity-0' : ''}
      aria-hidden={!ready}
    >
      {children}
    </div>
  )
}

export function HeaderConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted
        const connected = !!(ready && account && chain)

        return (
          <HeaderConnectWalletButtonWrapper ready={ready}>
            <NetworkButtonAndConnectButton
              connected={connected}
              chainUnsupported={chain?.unsupported}
              openChainModal={openChainModal}
              openConnectModal={openConnectModal}
            />
          </HeaderConnectWalletButtonWrapper>
        )
      }}
    </ConnectButton.Custom>
  )
}
