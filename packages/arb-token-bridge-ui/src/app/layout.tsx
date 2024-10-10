import { Metadata } from 'next'
import localFont from 'next/font/local'
import Head from 'next/head'
import Image from 'next/image'
import EclipseBottom from '@/images/eclipse_bottom.png'
import { twMerge } from 'tailwind-merge'

import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import 'react-toastify/dist/ReactToastify.css'

import '../styles/tailwind.css'
import '../styles/purple.css'
import '@rainbow-me/rainbowkit/styles.css'
import { SiteBanner } from '../components/common/SiteBanner'
import { AppSidebar } from '../components/Sidebar/AppSidebar'
import { Toast } from '../components/common/atoms/Toast'

const siteTitle = 'Bridge to Arbitrum'
const siteDescription =
  'Built to scale Ethereum, Arbitrum brings you 10x lower costs while inheriting Ethereum’s security model. Arbitrum is a Layer 2 Optimistic Rollup.'

const unica = localFont({
  src: [
    {
      path: '../font/Unica77LLWeb-Light.woff2',
      weight: '300',
      style: 'normal'
    },
    {
      path: '../font/Unica77LLWeb-Regular.woff2',
      weight: '400',
      style: 'normal'
    },
    {
      path: '../font/Unica77LLWeb-Medium.woff2',
      weight: '500',
      style: 'normal'
    }
  ],
  variable: '--font-unica77',
  fallback: ['Roboto', 'sans-serif']
})

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription
}

export default function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/logo.png" />

        <meta name="theme-color" content="#000000" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body>
        <div className={twMerge('relative flex-col', unica.className)}>
          <Image
            src={EclipseBottom}
            alt="grains"
            className="absolute left-1/2 top-0 w-full -translate-x-1/2 rotate-180 opacity-20"
            aria-hidden
          />
          <Image
            src={EclipseBottom}
            alt="grains"
            className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 opacity-20"
            aria-hidden
          />
          <div className="relative flex flex-col sm:min-h-screen">
            <div className="flex flex-row">
              <AppSidebar />

              <main className="grow">
                {/* 
                Warning: DO NOT remove the `SiteBanner` component. 
                It also dynamically displays Arbiscan/Novascan status. 
                To hide or remove its content, simply empty out its children instead of removing the entire component. 
              */}
                <SiteBanner />

                {children}
              </main>

              <Toast />
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
