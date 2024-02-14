import Image from 'next/image'
import Link from 'next/link'
import { twMerge } from 'tailwind-merge'

import ArbitrumLogoExpanded from '@/images/HeaderArbitrumLogoMainnet.svg'
import ArbitrumLogoCollapsed from '@/images/ArbitrumLogo.svg'
import { useSidebarStore } from './SidebarStore'

export const SidebarHeader = () => {
  const { sidebarOpened } = useSidebarStore()

  return (
    <div
      className={twMerge(
        'shrink-0 grow-0',
        'flex-col items-center justify-center gap-x-[16px] overflow-hidden pb-[24px]',
        sidebarOpened ? 'px-[16px]' : 'px-[4px]'
      )}
    >
      <Link
        href="/"
        className={twMerge(
          'arb-hover flex cursor-pointer flex-col items-start',
          sidebarOpened && 'items-start px-[16px]'
        )}
      >
        <Image
          id="header-image-expanded"
          src={ArbitrumLogoExpanded}
          alt="Arbitrum logo"
          className={twMerge(
            'w-[120px] min-w-[120px]',
            !sidebarOpened && 'hidden'
          )}
        />
        <Image
          id="header-image-collapsed"
          src={ArbitrumLogoCollapsed}
          alt="Arbitrum logo"
          className={twMerge(
            'ml-[10px] h-[30px] w-[30px]',
            sidebarOpened && 'hidden'
          )}
        />
      </Link>
    </div>
  )
}
