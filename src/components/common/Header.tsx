import React, { Fragment } from 'react'

import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/solid'

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ')
}

function ExplorerMenu() {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className=" hidden md:inline-flex text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
          Explorers
          <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="z-50 origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <a
                  href="https://explorer.arbitrum.io/"
                  target="_blank"
                  className={classNames(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block px-4 py-2 text-sm'
                  )}
                  rel="noreferrer"
                >
                  Mainnet
                </a>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <a
                  href="https://rinkeby-explorer.arbitrum.io/"
                  target="_blank"
                  className={classNames(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block px-4 py-2 text-sm'
                  )}
                  rel="noreferrer"
                >
                  Rinkeby
                </a>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
const Header: React.FC = () => {
  return (
    <header>
      <div className="border-b border-gray-700">
        <div className="flex items-center w-full h-16 px-4 sm:px-0 justify-between">
          <div className="flex items-center">
            <a href="/" className="flex-shrink-0">
              <img
                className="w-8 h-8"
                src="/images/Arbitrum_Symbol_-_Full_color_-_White_background.svg"
                alt="Arbitrum logo"
              />
            </a>
            <div className="block">
              <div className="ml-6 flex items-baseline space-x-4">
                <a
                  href="/"
                  className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Bridge
                </a>
                <a
                  href="https://portal.arbitrum.one/"
                  target="_blank"
                  className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  rel="noopener noreferrer"
                >
                  Portal
                </a>
                <ExplorerMenu />
                <a
                  href="https://developer.offchainlabs.com/"
                  target="_blank"
                  className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  rel="noopener noreferrer"
                >
                  Docs
                </a>
                <a
                  href="/data/token-list-42161.json"
                  target="_blank"
                  className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  rel="noopener noreferrer"
                >
                  Token List
                </a>
                <a
                  href="/tos"
                  target="_blank"
                  className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
          <div>
            <a
              href="https://discord.com/invite/5KE54JwyTs"
              target="_blank"
              className="bg-bright-blue hover:bg-faded-blue text-navy rounded-md text-sm font-medium"
              style={{ padding: '10px 12px' }}
              rel="noopener noreferrer"
            >
              Join Community
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

export { Header }
