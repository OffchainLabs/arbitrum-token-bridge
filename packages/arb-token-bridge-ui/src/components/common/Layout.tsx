import React, { useMemo } from 'react'
import { useWindowSize } from 'react-use'
import { motion, useViewportScroll, useTransform } from 'framer-motion'

import { Header } from './Header'
import { Footer } from './Footer'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import useTwitter from '../../hooks/useTwitter'

function NotificationContainer({ children }: { children: React.ReactNode }) {
  const { l1 } = useNetworksAndSigners()

  const isMainnet = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return true
    }

    return l1.network.chainID === 1
  }, [l1])

  const bgClassName = isMainnet ? 'bg-black' : 'bg-blue-arbitrum'

  return (
    <div className={`flex w-full justify-center ${bgClassName}`}>
      <div className="max-w-1440px w-full lg:px-8">
        <div className="flex w-full">{children}</div>
      </div>
    </div>
  )
}

function Notification({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-2 px-3 text-cyan lg:w-auto lg:text-sm">{children}</div>
  )
}

function ArbitrumBetaNotification() {
  return (
    <Notification>
      <span>
        Arbitrum is in beta.{' '}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://developer.offchainlabs.com/docs/mainnet#some-words-of-caution"
          className="arb-hover underline"
        >
          Learn more.
        </a>
      </span>
    </Notification>
  )
}

function RinkebyTestnetNotification() {
  return (
    <Notification>
      <a
        target="_blank"
        rel="noreferrer"
        href="https://developer.offchainlabs.com/docs/mainnet#some-words-of-caution"
        className="arb-hover underline"
      >
        What is Rinkeby Testnet?
      </a>
    </Notification>
  )
}

function NitroDevnetNotification() {
  const handleTwitterClick = useTwitter()

  return (
    <Notification>
      <button onClick={handleTwitterClick} className="underline">
        Request testnet ETH from the Nitro Devnet Twitter faucet!
      </button>
    </Notification>
  )
}

type LayoutProps = {
  children: React.ReactNode
}

function Moon() {
  const { width } = useWindowSize()
  const moonScaleRange = width >= 1024 ? [1, 1.25] : [0.75, 1.75]

  const { scrollYProgress } = useViewportScroll()
  const scale = useTransform(scrollYProgress, [0, 1], moonScaleRange)

  return (
    <motion.img
      src="/images/moon.png"
      alt="Moon"
      className="absolute bottom-[-10%] z-0 lg:bottom-[-45%] lg:right-0 lg:max-w-[75vw]"
      style={{ scale }}
    />
  )
}

export function Layout(props: LayoutProps) {
  const { l1 } = useNetworksAndSigners()

  const isMainnet = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return false
    }

    return l1.network.chainID === 1
  }, [l1])

  const isRinkeby = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return false
    }

    return l1.network.chainID === 4
  }, [l1])

  const isNitro = useMemo(() => {
    if (typeof l1.network === 'undefined') {
      return false
    }

    return l1.network.chainID === 5
  }, [l1])

  return (
    <div
      style={{ backgroundImage: 'url(/images/space.jpeg)' }}
      className="relative flex min-h-screen flex-col overflow-hidden bg-repeat"
    >
      <Header />

      <div className="bg-gradient-overlay z-10 flex min-h-[calc(100vh-100px)] flex-col lg:space-y-8">
        <NotificationContainer>
          {isMainnet && <ArbitrumBetaNotification />}
          {isRinkeby && <RinkebyTestnetNotification />}
          {isNitro && <NitroDevnetNotification />}
        </NotificationContainer>

        <main>{props.children}</main>
      </div>

      <Footer />

      <Moon />
    </div>
  )
}
