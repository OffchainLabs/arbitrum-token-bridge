import React from 'react'
import Image from 'next/image'
import { twMerge } from 'tailwind-merge'
import ArbitrumLogoSmall from '@/images/ArbitrumLogo.svg'
import { useAccount } from 'wagmi'

import { isNetwork } from '../../util/networks'
import { useNetworks } from '../../hooks/useNetworks'
import { useDestinationChainStyle } from '../../hooks/useDestinationChainStyle'
import { AppMobileSidebar } from '../Sidebar/AppMobileSidebar'
import { isExperimentalModeEnabled } from '../../util'
import { HeaderAccountPopover } from './HeaderAccountPopover'
import { HeaderConnectWalletButton } from './HeaderConnectWalletButton'

export function HeaderAccountOrConnectWalletButton() {
  const { isConnected } = useAccount()

  if (isConnected) {
    return <HeaderAccountPopover />
  }
  return <HeaderConnectWalletButton />
}

export function Header({ children }: { children?: React.ReactNode }) {
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)

  const isExperimentalMode = isExperimentalModeEnabled()

  const destinationChainStyle = useDestinationChainStyle()

  return (
    <header
      className={twMerge(
        'sticky top-0 z-10 flex h-12 w-full justify-center bg-black/70 px-4 backdrop-blur sm:relative sm:h-16 sm:px-6 sm:backdrop-blur-none [body.menu-open_&]:fixed',
        isTestnet || isExperimentalMode
          ? 'sm:border-b sm:border-white sm:bg-white/20'
          : 'sm:bg-transparent',
        destinationChainStyle.borderColor ? 'sm:border-b' : ''
      )}
      style={{
        ...destinationChainStyle,
        borderColor: isExperimentalMode
          ? 'red'
          : destinationChainStyle.borderColor
      }}
    >
      <div className="flex w-full items-center justify-end gap-2 text-white">
        <Image
          className="mr-auto h-6 w-6 sm:hidden"
          src={ArbitrumLogoSmall}
          alt="Arbitrum"
        />
        {isTestnet && !isExperimentalMode && (
          <span className="grow font-medium">TESTNET MODE</span>
        )}
        {isExperimentalMode && (
          <span className="grow font-medium text-red-500">
            EXPERIMENTAL MODE: features may be incomplete or not work properly
          </span>
        )}
        <div className="hidden sm:flex">{children}</div>
      </div>
      <AppMobileSidebar />
    </header>
  )
}
