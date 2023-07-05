import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Disclosure } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'
import Image, { ImageProps } from 'next/image'

import HeaderLogoMainnetSVG from '@/images/HeaderArbitrumLogoMainnet.svg'
import Discord from '@/icons/discord.webp'
import Twitter from '@/icons/twitter.webp'
import { Transition } from './Transition'
import { ExternalLink } from './ExternalLink'
import {
  HeaderMenuDesktop,
  HeaderMenuMobile,
  HeaderMenuProps
} from './HeaderMenu'
import { GET_HELP_LINK } from '../../constants'

const defaultHeaderClassName = 'z-40 flex h-[80px] justify-center lg:bg-black'

function toHeaderMenuProps(
  links: { title: string; link: string }[]
): HeaderMenuProps {
  return {
    items: links.map(item => ({
      title: item.title,
      anchorProps: { href: item.link }
    }))
  }
}

const learnMenuProps = toHeaderMenuProps([
  {
    title: 'Dev docs',
    link: 'https://developer.offchainlabs.com'
  },
  {
    title: 'About bridging',
    link: 'https://developer.arbitrum.io/getting-started-users'
  },
  {
    title: 'About Arbitrum',
    link: 'https://developer.offchainlabs.com/docs/inside_arbitrum'
  }
])

const explorersMenuProps = toHeaderMenuProps([
  {
    title: 'Arbitrum One',
    link: 'https://arbiscan.io'
  },
  {
    title: 'Arbitrum Nova',
    link: 'https://nova.arbiscan.io'
  },
  {
    title: 'Arbitrum Goerli',
    link: 'https://goerli.arbiscan.io'
  }
])

const chartsStatsMenuProps = toHeaderMenuProps([
  {
    title: 'How much gas am I saving?',
    link: 'https://gas.arbitrum.io'
  },
  {
    title: 'What’s up with my retryable?',
    link: 'https://retryable-tx-panel.arbitrum.io'
  },
  {
    title: 'How popular is Arbitrum?',
    link: 'https://dune.com/Henrystats/arbitrum-metrics'
  },
  {
    title: 'Which L2 do people trust most?',
    link: 'https://l2beat.com'
  }
])

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
      className="arb-hover hidden whitespace-nowrap text-base text-white lg:block lg:pr-4"
      {...props}
    >
      {children}
    </ExternalLink>
  )
}

export type HeaderOverridesProps = {
  imageSrc?: string
  className?: string
}

export function HeaderOverrides({ imageSrc, className }: HeaderOverridesProps) {
  const header = document.getElementById('header')

  if (header) {
    if (className) {
      // Reset back to defaults and then add overrides on top of that
      header.className = defaultHeaderClassName
      header.classList.add(...className.split(' '))
    }

    const image = document.getElementById('header-image') as HTMLImageElement

    if (image && imageSrc) {
      image.src = imageSrc
    }
  }

  return null
}

function HeaderImageElement({ ...props }: ImageProps) {
  return (
    <Image
      id="header-image"
      src={props.src}
      alt={props.alt || 'Arbitrum logo'}
      className={twMerge('-ml-2 w-40 lg:ml-0', props.className || '')}
    />
  )
}

export function HeaderContent({ children }: { children: React.ReactNode }) {
  const mutationObserverRef = useRef<MutationObserver>()
  const [, setMutationCycleCount] = useState(0)

  useEffect(() => {
    const header = document.getElementById('header')

    if (!header) {
      return
    }

    /**
     * On mobile, the header opens up and closes through a popover component by clicking the hamburger menu.
     * It's possible for the popover to be closed at the time of rendering this component.
     * This means that the portal root element won't be found, and nothing will be rendered to the portal.
     *
     * This is a little trick that sets up a `MutationObserver` to listen for changes to the header subtree.
     * Each time a mutation happens, it will call `setMutationCycleCount`, forcing a re-render to the portal.
     *
     * There's no real performance concern, as the contents of the header change very rarely.
     */
    const config = { subtree: true, childList: true }
    mutationObserverRef.current = new MutationObserver(() =>
      setMutationCycleCount(
        prevMutationCycleCount => prevMutationCycleCount + 1
      )
    )
    mutationObserverRef.current.observe(header, config)

    return () => mutationObserverRef.current?.disconnect()
  }, [])

  const rootElement = document.getElementById('header-content-root')

  if (!rootElement) {
    return null
  }

  return ReactDOM.createPortal(children, rootElement)
}

export function Header() {
  return (
    <header id="header" className={defaultHeaderClassName}>
      <div className="flex w-full max-w-[1440px] justify-between px-8">
        <div className="flex items-center lg:space-x-2 xl:space-x-12">
          <a href="/" className="arb-hover flex shrink-0 flex-col items-center">
            <HeaderImageElement
              src={HeaderLogoMainnetSVG}
              alt="Arbitrum logo"
            />
          </a>
          <div className="hidden items-center lg:flex lg:space-x-2 xl:space-x-6">
            <HeaderMenuDesktop {...learnMenuProps}>Learn</HeaderMenuDesktop>
            <HeaderMenuDesktop
              items={[
                {
                  title: 'Arbitrum One Portal',
                  anchorProps: { href: 'https://portal.arbitrum.one' }
                },
                {
                  title: 'Arbitrum Nova Portal',
                  anchorProps: { href: 'https://portal-nova.arbitrum.io' }
                },
                {
                  title: 'Explorers',
                  items: explorersMenuProps.items
                }
              ]}
            >
              Ecosystem
            </HeaderMenuDesktop>
            <HeaderMenuDesktop {...chartsStatsMenuProps}>
              Charts & Stats
            </HeaderMenuDesktop>
            <DesktopExternalLink href={GET_HELP_LINK}>
              Get Help
            </DesktopExternalLink>
          </div>
        </div>
        <Disclosure>
          {({ open }) => (
            <div className="flex items-center">
              {!open && (
                <Disclosure.Button
                  className="lg:hidden"
                  aria-label="Menu Toggle Button"
                >
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
        <div className="hidden flex-grow items-center justify-end lg:flex lg:space-x-2 xl:space-x-4">
          <div
            id="header-content-root"
            className="flex space-x-2 xl:space-x-4"
          ></div>
          <div className="flex flex-row space-x-2 xl:space-x-4">
            <ExternalLink
              href="https://discord.com/invite/ZpZuw7p"
              className="arb-hover h-8 w-8"
            >
              <Image src={Discord} alt="Discord" />
            </ExternalLink>
            <ExternalLink
              href="https://twitter.com/OffchainLabs"
              className="arb-hover h-8 w-8"
            >
              <Image src={Twitter} alt="Twitter" />
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
      className="arb-hover flex w-full flex-row flex-nowrap items-center space-x-4 px-6 py-3 text-2xl font-medium text-white"
      {...props}
    >
      {children}
    </ExternalLink>
  )
}

const HeaderItemLogo = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <span className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#8d8e8e]">
      <Image src={src} alt={alt} width={22} height={22} />
    </span>
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
      <div className="flex min-h-screen flex-col items-center gap-1 bg-dark">
        <div
          id="header-content-root"
          className="flex w-full flex-col-reverse items-center pt-4"
        ></div>
        <HeaderMenuMobile {...learnMenuProps}>
          <HeaderItemLogo
            src="/images/header/headerLogo_learn.svg"
            alt="Learn"
          />
          Learn
        </HeaderMenuMobile>
        <HeaderMenuMobile
          items={[
            {
              title: 'Arbitrum One Portal',
              anchorProps: { href: 'https://portal.arbitrum.one' }
            },
            {
              title: 'Arbitrum Nova Portal',
              anchorProps: { href: 'https://portal-nova.arbitrum.io' }
            }
          ]}
        >
          <HeaderItemLogo
            src="/images/header/headerLogo_ecosystem.svg"
            alt="Ecosystem"
          />
          Ecosystem
        </HeaderMenuMobile>
        <HeaderMenuMobile {...explorersMenuProps}>
          <HeaderItemLogo
            src="/images/header/headerLogo_explorers.svg"
            alt="Explorers"
          />
          Explorers
        </HeaderMenuMobile>
        <HeaderMenuMobile {...chartsStatsMenuProps}>
          <HeaderItemLogo
            src="/images/header/headerLogo_chartsAndStats.svg"
            alt="Charts and Stats"
          />
          Charts & Stats
        </HeaderMenuMobile>
        <MobileExternalLink href={GET_HELP_LINK}>
          <HeaderItemLogo
            src="/images/header/headerLogo_help.svg"
            alt="Get Help"
          />
          Get Help
        </MobileExternalLink>
      </div>
    </div>
  )
}
