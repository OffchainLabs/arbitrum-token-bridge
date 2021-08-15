import React from 'react'

import { useRouteMatch } from 'react-router-dom'

import Footer from './Footer'
import { Header } from './Header'

const Layout: React.FC = ({ children }) => {
  // const noHeaderLogo = useRouteMatch('/tx/:slug')?.isExact
  // const isAddress = useRouteMatch('/address/:slug')?.isExact
  // const isBlock = useRouteMatch('/block/:slug')?.isExact
  // const isLanding = useRouteMatch('/')?.isExact
  // const isLabels = useRouteMatch('/labels')?.isExact
  // const is404 = useRouteMatch('/404')?.isExact

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-gray-800 overflow-hidden">
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative min-h-heading`}
        >
          <Header />

          <div className={'block'}>
            <div className="pt-10 pb-5 relative z-10">
              <h1 className="text-3xl font-bold text-white">
                Welcome to Arbitrum Explorer
              </h1>
            </div>
          </div>

          <div className="absolute z-1 -right-8 -bottom-20 w-48 md:right-8 md:-bottom-24 md:w-64 lg:-bottom-40 lg:w-96">
            <img
              className="w-full"
              src="/images/Arbitrum_Symbol_-_Full_color_-_White_background_inner.svg"
              alt="Arbitrum logo"
            />
          </div>
        </div>
      </div>

      <main className="mt-16 flex-grow">
        <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export { Layout }
