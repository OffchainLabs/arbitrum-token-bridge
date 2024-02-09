import localFont from 'next/font/local'
import React from 'react'
import { twMerge } from 'tailwind-merge'

import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from '../Sidebar'
import { Toast } from './atoms/Toast'
import { SiteBanner } from './SiteBanner'
import { ExternalLink } from './ExternalLink'

import 'react-toastify/dist/ReactToastify.css'

const unica = localFont({
  src: [
    {
      path: '../../font/Unica77LLWeb-Light.woff2',
      weight: '300',
      style: 'normal'
    },
    {
      path: '../../font/Unica77LLWeb-Regular.woff2',
      weight: '400',
      style: 'normal'
    },
    {
      path: '../../font/Unica77LLWeb-Medium.woff2',
      weight: '500',
      style: 'normal'
    }
  ],
  variable: '--font-unica77',
  fallback: ['Roboto', 'sans-serif']
})

export type LayoutProps = {
  children: React.ReactNode
}

export function Layout(props: LayoutProps) {
  return (
    <div
      style={{ backgroundImage: 'url(/images/space.webp)' }}
      className={twMerge(
        'background-image relative flex min-h-screen flex-col overflow-hidden bg-repeat',
        unica.className
      )}
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
      <div className="flex flex-row">
        <Sidebar />
        <div className="grow">
          <Header />

          <div className="bg-gradient-overlay flex min-h-[calc(100vh-80px)] flex-col">
            <main className="pb-8">{props.children}</main>
          </div>

          <Toast />
        </div>
      </div>
    </div>
  )
}
