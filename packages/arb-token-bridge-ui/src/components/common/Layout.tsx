import React, { useMemo } from 'react'

import Footer from './Footer'
import { Header } from './Header'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const Layout: React.FC = ({ children }) => {
  const {
    l1: { network: l1Network }
  } = useNetworksAndSigners()

  const headerText = useMemo(() => {
    if (typeof l1Network === 'undefined') {
      return 'Arbitrum'
    }

    switch (l1Network.chainID) {
      case 1:
        return 'Arbitrum One Bridge'
      case 4:
        return 'RinkArby Testnet Bridge'
      case 5:
        return 'Arbitrum Nitro Devnet Bridge'
      default:
        return 'Arbitrum Mainnet Bridge'
    }
  }, [l1Network])

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-gray-800">
        <Header />
      </div>

      <div className="bg-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative min-h-heading">
          <div className="block">
            <div className="pt-10 pb-5 relative z-10">
              <h1 className="text-3xl font-bold text-white">{headerText}</h1>
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

      <main className="bg-v3-gray-2 mt-12 flex-grow">
        <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export { Layout }
