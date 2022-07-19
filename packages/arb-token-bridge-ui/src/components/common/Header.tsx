import React, { useMemo } from 'react'
import { Disclosure } from '@headlessui/react'

import { Transition } from './Transition'
import { ExternalLink } from './ExternalLink'
import { HeaderMenuDesktop, HeaderMenuMobile } from './HeaderMenu'
import { HeaderAccountPopover } from './HeaderAccountPopover'
import { HeaderNetworkInformation } from './HeaderNetworkInformation'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const learnLinks = [
  {
    title: 'Dev docs',
    link: 'https://developer.offchainlabs.com'
  },
  {
    title: 'About bridging',
    link: 'https://arbitrum.io/bridge-tutorial'
  },
  {
    title: 'About Arbitrum',
    link: 'https://developer.offchainlabs.com/docs/inside_arbitrum'
  }
]

const explorersLinks = [
  {
    title: 'Arbitrum One (Arbiscan)',
    link: 'https://arbiscan.io'
  },
  {
    title: 'Arbitrum One (Arbitrum’s explorer)',
    link: 'https://explorer.arbitrum.io'
  },
  {
    title: 'Rinkarby (Arbiscan)',
    link: 'https://testnet.arbiscan.io'
  },
  {
    title: 'Rinkarby (Arbitrum’s explorer)',
    link: 'https://rinkeby-explorer.arbitrum.io'
  },
  {
    title: 'Arbitrum Nova (BlockScout)',
    link: 'https://a4ba-explorer.arbitrum.io'
  },
  {
    title: 'Goerli Rollup (BlockScout)',
    link: 'https://goerli-rollup-explorer.arbitrum.io'
  }
]

const MenuIcon = {
  Open: function () {
    return (
      <svg
        width="40"
        height="24"
        viewBox="0 0 40 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="8" y1="1" x2="40" y2="1" stroke="#FFFFFF" strokeWidth="2" />
        <line x1="8" y1="13" x2="40" y2="13" stroke="#FFFFFF" strokeWidth="2" />
        <line x1="8" y1="25" x2="40" y2="25" stroke="#FFFFFF" strokeWidth="2" />
      </svg>
    )
  },
  Close: function () {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 29 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16.8285 14.0005L27.4145 3.4145C28.1965 2.6325 28.1965 1.3685 27.4145 0.5865C26.6325 -0.1955 25.3685 -0.1955 24.5865 0.5865L14.0005 11.1725L3.4145 0.5865C2.6325 -0.1955 1.3685 -0.1955 0.5865 0.5865C-0.1955 1.3685 -0.1955 2.6325 0.5865 3.4145L11.1725 14.0005L0.5865 24.5865C-0.1955 25.3685 -0.1955 26.6325 0.5865 27.4145C0.9765 27.8045 1.4885 28.0005 2.0005 28.0005C2.5125 28.0005 3.0245 27.8045 3.4145 27.4145L14.0005 16.8285L24.5865 27.4145C24.9765 27.8045 25.4885 28.0005 26.0005 28.0005C26.5125 28.0005 27.0245 27.8045 27.4145 27.4145C28.1965 26.6325 28.1965 25.3685 27.4145 24.5865L16.8285 14.0005Z"
          fill="white"
        />
      </svg>
    )
  }
}

function DesktopExternalLink({
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <ExternalLink
      className="arb-hover hidden text-base text-white lg:block"
      {...props}
    >
      {children}
    </ExternalLink>
  )
}

export function Header() {
  const {
    l1: { network: l1Network }
  } = useNetworksAndSigners()

  const isMainnet = useMemo(() => {
    if (typeof l1Network === 'undefined') {
      return true
    }

    return l1Network.chainID === 1
  }, [l1Network])

  const headerBgClassName = useMemo(() => {
    return isMainnet ? 'lg:bg-black' : 'lg:bg-blue-arbitrum'
  }, [isMainnet])

  return (
    <header
      className={`z-50 flex h-[80px] justify-center ${headerBgClassName}`}
    >
      <div className="flex w-full max-w-[1440px] justify-between px-8">
        <div className="flex items-center lg:space-x-6 xl:space-x-12">
          <a href="/" className="arb-hover flex flex-col items-center">
            <img
              src={`/images/ArbitrumHorizontal${l1Network?.chainID || 1}.png`}
              alt="Arbitrum"
              className="-ml-2 w-56 lg:ml-0 lg:w-60"
            />
          </a>
          <div className="hidden items-center lg:flex lg:space-x-4 xl:space-x-8">
            <HeaderMenuDesktop
              items={learnLinks.map(learn => ({
                title: learn.title,
                anchorProps: { href: learn.link }
              }))}
            >
              Learn
            </HeaderMenuDesktop>
            <HeaderMenuDesktop
              items={[
                {
                  title: 'App Portal',
                  anchorProps: { href: 'https://portal.arbitrum.one' }
                },
                {
                  title: 'Explorers',
                  items: explorersLinks.map(explorer => ({
                    title: explorer.title,
                    anchorProps: { href: explorer.link }
                  }))
                }
              ]}
            >
              Ecosystem
            </HeaderMenuDesktop>
            <DesktopExternalLink href="https://arbitrum.zendesk.com/hc/en-us/requests/new">
              Get Help
            </DesktopExternalLink>
          </div>
        </div>
        <Disclosure>
          {({ open }) => (
            <div className="flex items-center">
              {!open && (
                <Disclosure.Button className="lg:hidden">
                  <MenuIcon.Open />
                </Disclosure.Button>
              )}
              <Disclosure.Panel>
                <Transition>
                  <HeaderMobile />
                </Transition>
              </Disclosure.Panel>
            </div>
          )}
        </Disclosure>
        <div className="hidden flex-grow items-center justify-end lg:flex lg:space-x-4">
          <HeaderNetworkInformation />
          <HeaderAccountPopover />
          <div className="flex flex-row space-x-4">
            <ExternalLink
              href="https://discord.com/invite/ZpZuw7p"
              className="arb-hover h-8 w-8"
            >
              <img src="/icons/discord.png" alt="Discord" />
            </ExternalLink>
            <ExternalLink
              href="https://twitter.com/OffchainLabs"
              className="arb-hover h-8 w-8"
            >
              <img src="/icons/twitter.png" alt="Twitter" />
            </ExternalLink>
          </div>
        </div>
      </div>
    </header>
  )
}

function MobileExternalLink({
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <ExternalLink
      className="arb-hover py-3 text-2xl font-medium text-white"
      {...props}
    >
      {children}
    </ExternalLink>
  )
}

function HeaderMobile() {
  return (
    <div className="absolute left-0 top-0 z-50 min-h-screen w-full lg:hidden">
      <div className="flex h-[80px] items-center justify-end px-8">
        <Disclosure.Button className="text-white lg:hidden">
          <MenuIcon.Close />
        </Disclosure.Button>
      </div>
      <div className="flex min-h-screen flex-col items-center space-y-3 bg-blue-arbitrum pt-4">
        <HeaderAccountPopover />
        <HeaderNetworkInformation />
        <HeaderMenuMobile
          items={learnLinks.map(learn => ({
            title: learn.title,
            anchorProps: { href: learn.link }
          }))}
        >
          Learn
        </HeaderMenuMobile>
        <HeaderMenuMobile
          items={[
            {
              title: 'App Portal',
              anchorProps: { href: 'https://portal.arbitrum.one' }
            }
          ]}
        >
          Ecosystem
        </HeaderMenuMobile>
        <HeaderMenuMobile
          items={explorersLinks.map(explorer => ({
            title: explorer.title,
            anchorProps: { href: explorer.link }
          }))}
        >
          Explorers
        </HeaderMenuMobile>
        <MobileExternalLink href="https://arbitrum.zendesk.com/hc/en-us/requests/new">
          Get Help
        </MobileExternalLink>
      </div>
    </div>
  )
}
