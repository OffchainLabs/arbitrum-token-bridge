import React, { useMemo } from 'react'

import Footer from './Footer'
import { Header } from './Header'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

const Layout: React.FC = ({ children }) => {
  const { l2 } = useNetworksAndSigners()
  const { network: l2Network } = l2

  const headerText = useMemo(() => {
    if (typeof l2Network === 'undefined') {
      return 'Arbitrum Bridge'
    }

    switch (l2Network.chainID) {
      case 42161:
        return 'Arbitrum One Bridge'
      case 421611:
        return 'RinkArby Testnet Bridge'
      case 421612:
        return 'Arbitrum Nitro Devnet Bridge'
      case 42170:
        return 'Arbitrum AnyTrust Bridge'
      case 421613:
        return 'Arbitrum Rollup Goerli Testnet Bridge'
      default:
        return 'Arbitrum Bridge'
    }
  }, [l2Network])

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
