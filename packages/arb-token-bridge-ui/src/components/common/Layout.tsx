import React from 'react'
import { useWindowSize } from 'react-use'
import { motion, useScroll, useTransform } from 'framer-motion'

import { Footer } from './Footer'
import { ExternalLink } from './ExternalLink'
import { Toast } from './atoms/Toast'
import { SiteBanner } from './SiteBanner'

import { PORTAL_DOMAIN } from '../../constants'

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
      className="absolute bottom-[-10%] z-0 lg:bottom-[-700px] lg:right-0 lg:max-w-[1200px]"
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
        The Arbitrum Odyssey has officially returned! Complete missions and
        start collecting badges by visiting the{' '}
        <ExternalLink
          href={`${PORTAL_DOMAIN}/odyssey`}
          className="arb-hover underline"
        >
          Arbitrum Portal
        </ExternalLink>
        .
      </SiteBanner>

      {props.children}

      <Toast />

      <Footer />

      <Moon />
    </div>
  )
}
