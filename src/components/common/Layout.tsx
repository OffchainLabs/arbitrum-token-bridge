import React from 'react'

import Footer from './Footer'
import { Header } from './Header'

const Layout: React.FC = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative min-h-heading">
          <Header />

          <div className="block">
            <div className="pt-10 pb-5 relative z-10">
              <h1 className="text-3xl font-bold text-white">
                Welcome to Arbitrum Bridge
              </h1>
            </div>
          </div>

          <div className="absolute z-1 right-8 md:right-32 -bottom-24 w-64">
            <img
              className="w-full"
              src="/images/Arbitrum_Symbol_-_Full_color_-_White_background_inner.svg"
              alt="Arbitrum logo"
            />
          </div>
        </div>
      </div>

      <main className="mt-12 flex-grow">
        <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export { Layout }
