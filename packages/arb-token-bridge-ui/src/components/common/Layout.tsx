import React from 'react'
import { useWindowSize } from 'react-use'
import { motion, useViewportScroll, useTransform } from 'framer-motion'

import { Header } from './Header'
import { Footer } from './Footer'
// import { Toast } from './Toast'

import 'react-toastify/dist/ReactToastify.css'

function Moon() {
  const { width } = useWindowSize()
  const moonScaleRange = width >= 1024 ? [0.75, 1] : [0.75, 1.25]

  const { scrollYProgress } = useViewportScroll()
  const scale = useTransform(scrollYProgress, [0, 1], moonScaleRange)

  return (
    <motion.img
      src="/images/moon.webp"
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
      style={{ backgroundImage: 'url(/images/space.webp)' }}
      className="relative flex min-h-screen flex-col overflow-hidden bg-repeat"
    >
      <Header />

      <div className="bg-gradient-overlay flex min-h-[calc(100vh-80px)] flex-col">
        <main>{props.children}</main>
      </div>

      {/* <Toast /> */}

      <Footer />

      <Moon />
    </div>
  )
}
