import React from 'react'
import { useWindowSize } from 'react-use'
import { motion, useScroll, useTransform } from 'framer-motion'

import { Header } from './Header'
import { Footer } from './Footer'
import { ExternalLink } from './ExternalLink'
import { Toast } from './atoms/Toast'

import 'react-toastify/dist/ReactToastify.css'

function Moon() {
  const { width } = useWindowSize()
  const moonScaleRange = width >= 1024 ? [0.75, 1] : [0.75, 1.25]

  const { scrollYProgress } = useScroll()
  const scale = useTransform(scrollYProgress, [0, 1], moonScaleRange)

  return (
    <motion.img
      src="/images/moon.webp"
      alt="Moon"
      className="absolute bottom-[-10%] z-0 lg:bottom-[-65%] lg:right-0 lg:max-w-[75vw]"
      style={{ scale }}
    />
  )
}

export const DAOBanner = () => {
  return (
    <div className="bg-gradient px-4 py-2 text-center text-sm text-white lg:text-base">
      <span>
        Cross-Chain Transfer Protocol (
        <ExternalLink
          href="https://www.circle.com/en/cross-chain-transfer-protocol"
          className="arb-hover underline"
        >
          CCTP
        </ExternalLink>
        ) is now live on Arbitrum, enabling direct USDC transfers to-and-from
        Ethereum.{' '}
        <ExternalLink
          href="https://arbitrumfoundation.medium.com/usdc-to-come-natively-to-arbitrum-f751a30e3d83"
          className="arb-hover underline"
        >
          Learn more
        </ExternalLink>
        .
      </span>
    </div>
  )
}

export type LayoutProps = {
  children: React.ReactNode
}

export function Layout(props: LayoutProps) {
  return (
    <div
      style={{ backgroundImage: 'url(/images/space.webp)' }}
      className="background-image relative flex min-h-screen flex-col overflow-hidden bg-repeat"
    >
      <DAOBanner />
      <Header />

      <div className="bg-gradient-overlay flex min-h-[calc(100vh-80px)] flex-col">
        <main>{props.children}</main>
      </div>

      <Toast />

      <Footer />

      <Moon />
    </div>
  )
}
