import React, { Fragment } from 'react'

import { useWallet } from '@gimmixorg/use-wallet'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import {
  BellIcon,
  ChevronDownIcon,
  MenuIcon,
  XIcon
} from '@heroicons/react/solid'

import { useAppState } from '../../state'
import { modalProviderOpts } from '../../util/modelProviderOpts'

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
                  href="https://arbiscan.io/"
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

const JoinCommunityButton: React.FC = () => (
  <a
    href="https://discord.com/invite/5KE54JwyTs"
    target="_blank"
    className="bg-bright-blue hover:bg-faded-blue text-navy rounded-md text-sm font-medium"
    style={{ padding: '10px 12px' }}
    rel="noopener noreferrer"
  >
    Join Community
  </a>
)

const LoginButton: React.FC = () => {
  const {
    app: { networkID }
  } = useAppState()
  const { disconnect, connect } = useWallet()

  function showConnectionModal() {
    connect(modalProviderOpts)
  }

  return (
    <>
      {networkID ? (
        <button
          onClick={() => {
            disconnect()
            localStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER')
            window.location.href = '/'
          }}
          type="button"
          className="mr-4 text-white hover:text-navy hover:text-gray-200 hover:bg-gray-200 cursor-pointer z-50 rounded-md text-sm font-medium"
          style={{ padding: '10px 12px' }}
        >
          Logout
        </button>
      ) : (
        <button
          onClick={showConnectionModal}
          type="button"
          className="mr-4 text-white hover:text-navy hover:text-gray-200 hover:bg-gray-200 cursor-pointer z-50 rounded-md text-sm font-medium"
          style={{ padding: '10px 12px' }}
        >
          Login
        </button>
      )}
    </>
  )
}

const Header: React.FC = () => {
  return (
    <Disclosure as="header" className="relative z-50 bg-gray-800 ">
      {({ open }) => (
        <>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="border-b border-gray-700 flex items-center w-full h-16 px-4 sm:px-0 justify-between">
              <div className="flex items-center">
                <a href="/" className="flex-shrink-0">
                  <img
                    className="w-8 h-8"
                    src="/images/Arbitrum_Symbol_-_Full_color_-_White_background.svg"
                    alt="Arbitrum logo"
                  />
                </a>
                <div className="block">
                  <div className="ml-6 flex lg:hidden items-baseline space-x-4">
                    <a
                      href="/"
                      className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Bridge
                    </a>
                  </div>
                  <div className="ml-6 hidden lg:flex items-baseline space-x-4">
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
                      href="https://arbitrum.io/bridge-tutorial/"
                      target="_blank"
                      className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                      rel="noopener noreferrer"
                    >
                      Tutorial
                    </a>
                    <a
                      href="https://developer.offchainlabs.com/"
                      target="_blank"
                      className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                      rel="noopener noreferrer"
                    >
                      Docs
                    </a>
                    <a
                      href="https://arbitrum.zendesk.com/hc/en-us/requests/new"
                      target="_blank"
                      className="hidden md:inline-block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                      rel="noopener noreferrer"
                    >
                      Support
                    </a>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex items-center">
                <LoginButton />
                <JoinCommunityButton />
              </div>
              {/* Mobile menu button */}

              <div className="-ml-2 mr-2 flex items-center lg:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="lg:hidden absolute z-50 w-full bg-gray-800 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a
                href="https://portal.arbitrum.one/"
                target="_blank"
                className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                rel="noopener noreferrer"
              >
                Portal
              </a>
              <a
                href="https://arbiscan.io/"
                target="_blank"
                className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                rel="noopener noreferrer"
              >
                Mainnet Explorer
              </a>
              <a
                href="https://rinkeby-explorer.arbitrum.io/"
                target="_blank"
                className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                rel="noopener noreferrer"
              >
                Rinkeby Explorer
              </a>
              <a
                href="https://arbitrum.io/bridge-tutorial/"
                target="_blank"
                className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                rel="noopener noreferrer"
              >
                Tutorial
              </a>
              <a
                href="https://developer.offchainlabs.com/"
                target="_blank"
                className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                rel="noopener noreferrer"
              >
                Docs
              </a>
              <a
                href="https://arbitrum.zendesk.com/hc/en-us/requests/new"
                target="_blank"
                className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                rel="noopener noreferrer"
              >
                Support
              </a>
            </div>
            <div className="pt-4 pb-6 border-t border-gray-700">
              <div className="flex items-center justify-center mt-3 px-2 space-x-1 sm:px-3">
                <LoginButton /> <JoinCommunityButton />
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}

export { Header }
