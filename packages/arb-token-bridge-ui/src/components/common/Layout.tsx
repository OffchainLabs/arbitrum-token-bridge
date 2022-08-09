import React from 'react'
import { useWindowSize } from 'react-use'
import { motion, useViewportScroll, useTransform } from 'framer-motion'

import HeaderArbiturmLogoMainnet from 'src/assets/HeaderArbitrumLogoMainnet.png'
import { GET_HELP_LINK } from 'src/constants'

import { Footer, Header } from '@arbitrum/shared-ui'

function Moon() {
  const { width } = useWindowSize()
  const moonScaleRange = width >= 1024 ? [0.75, 1] : [0.75, 1.25]

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

export type LayoutProps = {
  children: React.ReactNode
}

export function Layout(props: LayoutProps) {
  return (
    <div
      style={{ backgroundImage: 'url(/images/space.jpeg)' }}
      className="relative flex min-h-screen flex-col overflow-hidden bg-repeat"
    >
      <Header
        logoSrc={HeaderArbiturmLogoMainnet}
        getHelpLink={GET_HELP_LINK}
      />

      <div className="bg-gradient-overlay z-20 flex min-h-[calc(100vh-80px)] flex-col">
        <main>{props.children}</main>
      </div>

      <Footer />

      <Moon />
    </div>
  )
}
