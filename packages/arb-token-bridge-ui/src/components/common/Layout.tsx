import React from 'react'

import { Header } from './Header'
import { Footer } from './Footer'
import { Toast } from './atoms/Toast'
import { SiteBanner } from './SiteBanner'
import { ExternalLink } from './ExternalLink'

import 'react-toastify/dist/ReactToastify.css'

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
        Arbitrum Orbit is mainnet-ready! Learn more about launching a customized
        chain{' '}
        <ExternalLink
          href="https://arbitrum.io/orbit"
          className="arb-hover underline"
        >
          here
        </ExternalLink>
        .
      </SiteBanner>
      <Header />

      <div className="bg-gradient-overlay flex min-h-[calc(100vh-80px)] flex-col">
        <main>{props.children}</main>
      </div>

      <Toast />

      <Footer />
    </div>
  )
}
