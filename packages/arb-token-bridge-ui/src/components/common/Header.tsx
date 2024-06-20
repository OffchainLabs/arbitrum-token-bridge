import React from 'react'
import Image from 'next/image'
import { twMerge } from 'tailwind-merge'
import ArbitrumLogoSmall from '@/images/ArbitrumLogo.svg'

import { isNetwork } from '../../util/networks'
import { useNetworks } from '../../hooks/useNetworks'
import { AppMobileSidebar } from '../Sidebar/AppMobileSidebar'
import { useOrbitChainFromRoute } from '../../hooks/useOrbitChainFromRoute'
import { NetworkImage } from './NetworkImage'

export function Header({ children }: { children?: React.ReactNode }) {
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)
  const { orbitChain, orbitStyles } = useOrbitChainFromRoute()

  return (
    <header
      className={twMerge(
        'sticky top-0 z-10 flex h-12 w-full justify-center bg-black/70 px-4 backdrop-blur sm:relative sm:h-16 sm:px-6 sm:backdrop-blur-none [body.menu-open_&]:fixed',
        isTestnet
          ? 'sm:border-b sm:border-white sm:bg-white/20'
          : 'sm:bg-transparent',
        orbitStyles ? 'sm:sm:border-b' : ''
      )}
      style={orbitStyles ?? undefined}
    >
      <div
        className={twMerge(
          'flex w-full items-center justify-end gap-2 text-white',
          orbitStyles && 'justify-between'
        )}
      >
        {orbitStyles && orbitChain ? (
          <div className="flex items-center gap-2">
            <NetworkImage
              chainId={orbitChain.chainID}
              className="h-[36px] w-[36px] bg-transparent lg:h-[48px] lg:w-[48px]"
              style={{ backgroundColor: 'transparent' }}
            />
            <div className="text-ellipsis whitespace-nowrap font-bold lg:text-xl">{`${orbitChain.name} Bridge`}</div>
          </div>
        ) : (
          <Image
            className="mr-auto h-6 w-6 sm:hidden"
            src={ArbitrumLogoSmall}
            alt="Arbitrum"
          />
        )}

        {isTestnet && <span className="grow font-medium">TESTNET MODE</span>}
        <div className="hidden sm:flex">{children}</div>
      </div>
      <AppMobileSidebar />
    </header>
  )
}
