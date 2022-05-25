import React, { Fragment } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'

import { ExternalLink } from './ExternalLink'

type HeaderMenuItem = {
  title: string
  anchorProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>
  items?: HeaderMenuItem[]
}

type HeaderMenuProps = {
  children: React.ReactNode
  items: HeaderMenuItem[]
}

export function HeaderMenuDesktop(props: HeaderMenuProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="hidden lg:inline-flex text-white text-base rounded-md arb-hover">
          {props.children}
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
        <Menu.Items className="z-50 origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-6 py-4">
            {props.items.map(item => {
              if (typeof item.anchorProps !== 'undefined') {
                return (
                  <Menu.Item>
                    <a
                      {...item.anchorProps}
                      target="_blank"
                      rel="noreferrer"
                      className="block -mx-6 px-6 py-1 hover:bg-v3-arbitrum-dark-blue hover:text-white cursor-pointer"
                    >
                      {item.title}
                    </a>
                  </Menu.Item>
                )
              }

              const subitems = item.items || []

              return (
                <div>
                  <div className="py-1">
                    <span>{item.title}</span>
                  </div>
                  <div>
                    {subitems.map(subitem => (
                      <Menu.Item>
                        <a
                          href={subitem.anchorProps?.href}
                          target="_blank"
                          rel="noreferrer"
                          className="block -mx-6 pl-10 pr-6 py-1 font-light hover:bg-v3-arbitrum-dark-blue hover:text-white"
                        >
                          {subitem.title}
                        </a>
                      </Menu.Item>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

export function HeaderMenuMobile(props: HeaderMenuProps) {
  return (
    <Disclosure>
      {({ open }) => (
        <div className="w-full">
          <Disclosure.Button
            className={`w-full py-3 arb-hover ${open && `bg-white`}`}
          >
            <span
              className={`font-medium text-white text-2xl ${
                open && `text-v3-arbitrum-dark-blue`
              }`}
            >
              {props.children}
            </span>
          </Disclosure.Button>
          <Disclosure.Panel>
            <ul className="space-y-4 pt-4 pb-8">
              {props.items.map(item => (
                <li className="text-white text-2xl font-light text-center">
                  <ExternalLink
                    href={item.anchorProps?.href}
                    className="hover:underline focus:underline"
                  >
                    {item.title}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  )
}
