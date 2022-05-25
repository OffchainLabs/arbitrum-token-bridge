import React, { Fragment, useMemo } from 'react'
import { useMedia } from 'react-use'
import { useWallet } from '@arbitrum/use-wallet'
import { Menu, Transition } from '@headlessui/react'

import { modalProviderOpts } from '../../util/modelProviderOpts'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus
} from '../../hooks/useNetworksAndSigners'

function MenuItemsTransition({ children }: { children: React.ReactNode }) {
  return (
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      {children}
    </Transition>
  )
}

export function HeaderAccountButton() {
  const { connect, disconnect, account } = useWallet()
  const { status } = useNetworksAndSigners()

  const isLarge = useMedia('(min-width: 1024px)')

  const address = useMemo(() => {
    if (typeof account === 'undefined') {
      return ''
    }

    const len = account.length

    return `${account.substring(0, 5)}...${account.substring(len - 4, len)}`
  }, [account])

  function disconnectWallet() {
    disconnect()
    localStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER')
    window.location.reload()
  }

  if (status === UseNetworksAndSignersStatus.NOT_CONNECTED) {
    return (
      <button
        onClick={() => connect(modalProviderOpts)}
        type="button"
        className="lg:bg-v3-lime-dark lg:px-6 py-3 rounded-full text-2xl lg:text-base text-white font-medium lg:font-normal arb-hover"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="arb-hover">
        <div className="py-3 lg:py-0">
          <div className="flex flex-row space-x-3 items-center lg:px-6 lg:py-2 lg:bg-v3-dark rounded-full">
            <div className="h-8 w-8 bg-v3-cyan-dark rounded-full border border-white" />
            <span className="text-white text-2xl lg:text-base font-medium lg:font-normal">
              {address}
            </span>
          </div>
        </div>
      </Menu.Button>
      <MenuItemsTransition>
        <Menu.Items
          className={
            isLarge
              ? 'z-50 origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none'
              : ''
          }
        >
          <div className="py-2">
            <button
              className="w-full text-2xl lg:text-base text-white lg:text-black text-left px-6 py-1 font-light lg:font-normal lg:hover:text-white hover:bg-v3-arbitrum-dark-blue hover:underline"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        </Menu.Items>
      </MenuItemsTransition>
    </Menu>
  )
}
