import React from 'react'
import { useWindowSize } from 'react-use'
import { motion, useScroll, useTransform } from 'framer-motion'

import { Header } from './Header'
import { Footer } from './Footer'
import { Toast } from './atoms/Toast'
import { SiteBanner } from './SiteBanner'
import { ExternalLink } from './ExternalLink'

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

export type LayoutProps = {
  children: React.ReactNode
}

export function Layout(props: LayoutProps) {
  return (
    <div
      style={{ backgroundImage: 'url(/images/space.webp)' }}
      className="background-image relative flex min-h-screen flex-col overflow-hidden bg-repeat"
    >
      <SiteBanner>
        The bridge is currently not supporting the{' '}
        <ExternalLink
          href="https://twitter.com/Ledger/status/1735291427100455293"
          className="arb-hover underline"
        >
          Ledger wallet.
        </ExternalLink>{' '}
        Please use other wallets in the meantime.
      </SiteBanner>
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
