import React from 'react'
import { Disclosure } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

import { isNetwork } from '../../util/networks'
import { useNetworks } from '../../hooks/useNetworks'
import { SidebarMenu } from '../Sidebar/SidebarMenu'
import { SidebarFooter } from '../Sidebar/SidebarFooter'

export function Header({ children }: { children: React.ReactNode }) {
  const [{ sourceChain }] = useNetworks()
  const { isTestnet } = isNetwork(sourceChain.id)

  return (
    <header
      className={twMerge(
        'sticky top-0 z-10 flex h-[80px] justify-center px-4',
        isTestnet && 'border-b border-white bg-white/20 backdrop-blur-sm'
      )}
    >
      <div className="flex w-full items-center justify-end font-medium text-white">
        {isTestnet && <span className="grow">TESTNET MODE</span>}
        <div className="hidden lg:flex">{children}</div>
      </div>
      <Disclosure>
        {({ open }) => (
          <>
            {!open && (
              <Disclosure.Button
                className="lg:hidden"
                aria-label="Menu Toggle Button"
              >
                <Bars3Icon className="h-8 w-8 stroke-1 text-white" />
              </Disclosure.Button>
            )}
            <Disclosure.Panel>
              <HeaderMobile>{children}</HeaderMobile>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </header>
  )
}

function HeaderMobile({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed left-0 top-0 z-50 min-h-screen w-full lg:hidden">
      <div className="flex min-h-screen flex-col items-center gap-1 bg-dark">
        <Disclosure.Button className="flex w-full justify-end px-4 pt-4 lg:hidden">
          <XMarkIcon className="h-8 w-8 text-white" />
        </Disclosure.Button>
        {children}
        {/* Mobile menu panel */}
        <SidebarMenu menuItemClickCallback={close} className="px-4" />
        <SidebarFooter className="self-end px-12 pb-6" />
      </div>
    </div>
  )
}
