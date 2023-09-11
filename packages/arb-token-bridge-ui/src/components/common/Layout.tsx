import React from 'react'
import { useWindowSize } from 'react-use'
import { motion, useScroll, useTransform } from 'framer-motion'

import { Header } from './Header'
import { Footer } from './Footer'
import { ExternalLink } from './ExternalLink'
import { Toast } from './atoms/Toast'
import { SiteBanner } from './SiteBanner'

import { DOCS_DOMAIN } from '../../constants'

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
        The Stylus testnet is officially live! You can now build EVM-compatible
        apps in Rust by visiting the{' '}
        <ExternalLink
          href={`${DOCS_DOMAIN}/stylus/stylus-gentle-introduction`}
          className="arb-hover underline"
        >
          Stylus docs
        </ExternalLink>
        .
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
