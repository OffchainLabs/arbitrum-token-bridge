import React from 'react'
import Image from 'next/image'
import { twMerge } from 'tailwind-merge'
import ArbitrumLogoSmall from '@/images/ArbitrumLogo.svg'

import { isNetwork } from '../../util/networks'
import { useNetworks } from '../../hooks/useNetworks'
import { AppMobileSidebar } from '../Sidebar/AppMobileSidebar'
import { AccountMenuItem } from '../Sidebar/AccountMenuItem'
import { useAccount } from 'wagmi'
import { HeaderConnectWalletButton } from './HeaderConnectWalletButton'

export function Header({ children }: { children?: React.ReactNode }) {
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const { isConnected } = useAccount()

  return (
    <header
      className={twMerge(
        'sticky right-0 top-0 z-10 flex h-12 w-full items-center justify-center bg-black/70 px-4 backdrop-blur sm:relative sm:h-16 sm:px-6 sm:backdrop-blur-none [body.menu-open_&]:fixed',
        isTestnet
          ? 'sm:border-b sm:border-white sm:bg-white/20'
          : 'sm:bg-transparent'
      )}
    >
      <div className="flex w-full items-center justify-end gap-2 text-white">
        <Image
          className="mr-auto h-6 w-6 sm:hidden"
          src={ArbitrumLogoSmall}
          alt="Arbitrum"
        />
        {isTestnet && <span className="grow font-medium">TESTNET MODE</span>}
        <div className="absolute top-4 hidden sm:flex">{children}</div>
      </div>
      <AppMobileSidebar />
    </header>
  )
}
