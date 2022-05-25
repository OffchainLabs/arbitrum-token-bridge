import React, { useMemo } from 'react'
import { Disclosure } from '@headlessui/react'

import { ExternalLink } from './ExternalLink'
import { HeaderMenuDesktop, HeaderMenuMobile } from './HeaderMenu'
import { HeaderAccountButton } from './HeaderAccountButton'
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
    title: 'Mainnet (Arbiscan)',
    link: 'https://arbiscan.io'
  },
  {
    title: 'Mainnet (Arbitrum’s explorer)',
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
    title: 'Nitro Devnet (BlockScout)',
    link: 'https://nitro-devnet-explorer.arbitrum.io'
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
      className="hidden lg:block text-white text-base arb-hover"
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
    return isMainnet ? 'lg:bg-black' : 'lg:bg-v3-arbitrum-dark-blue'
  }, [isMainnet])

  return (
    <header className={`flex justify-center h-100px z-50 ${headerBgClassName}`}>
      <div className="flex justify-between w-full max-w-1440px px-8">
        <div className="flex items-center lg:space-x-6 xl:space-x-12">
          <a href="/" className="flex flex-col items-center arb-hover">
            <img
              src="/images/ArbitrumHorizontalLogoWhiteText.png"
              alt="Arbitrum"
              className="w-56 lg:w-60 -ml-2 lg:ml-0"
            />
          </a>
          <div className="hidden lg:flex items-center lg:space-x-4 xl:space-x-8">
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
                <HeaderMobile />
              </Disclosure.Panel>
            </div>
          )}
        </Disclosure>
        <div className="hidden lg:flex items-center lg:space-x-4">
          <HeaderNetworkInformation />
          <HeaderAccountButton />
          <div className="flex flex-row space-x-4">
            <ExternalLink
              href="https://discord.com/invite/ZpZuw7p"
              className="h-8 w-8 arb-hover"
            >
              <img src="/icons/discord.png" alt="Discord" />
            </ExternalLink>
            <ExternalLink
              href="https://twitter.com/OffchainLabs"
              className="h-8 w-8 arb-hover"
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
      className="text-white text-2xl font-medium py-3 arb-hover"
      {...props}
    >
      {children}
    </ExternalLink>
  )
}

function HeaderMobile() {
  return (
    <div className="lg:hidden w-full absolute left-0 top-0 min-h-screen z-50">
      <div className="flex items-center justify-end h-100px px-8">
        <Disclosure.Button className="lg:hidden text-white">
          <MenuIcon.Close />
        </Disclosure.Button>
      </div>
      <div className="flex flex-col items-center space-y-3 bg-v3-arbitrum-dark-blue pt-4 min-h-screen">
        <HeaderAccountButton />
        <HeaderNetworkInformation />
        <HeaderMenuMobile
          items={explorersLinks.map(explorer => ({
            title: explorer.title,
            anchorProps: { href: explorer.link }
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
            title: explorer.link,
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
