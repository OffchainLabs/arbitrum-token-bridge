import React, { ReactNode } from 'react'

import { Header, HeaderProps } from './Header'
import { Footer } from './Footer'

import SpaceImage from '../internal/space.jpeg'

interface LayoutProps extends HeaderProps {
  children: ReactNode
}

export function Layout(props: LayoutProps) {
  return (
    <div
      style={{ backgroundImage: `url(${SpaceImage})` }}
      className="relative flex min-h-screen flex-col overflow-hidden bg-repeat"
    >
      <Header
        logoSrc={props.logoSrc}
        getHelpLink={props.getHelpLink}
      />

      <div className="bg-gradient-overlay z-20 flex min-h-[calc(100vh-80px)] flex-col">
        <main>{props.children}</main>
      </div>

      <Footer />
    </div>
  )
}
