import React, { useMemo } from 'react'

import { useAppState } from 'src/state'

import Footer from './Footer'
import { Header } from './Header'

const Layout: React.FC = ({ children }) => {
  const {
    app: { l1NetworkDetails }
  } = useAppState()

  const headerText = useMemo(() => {
    const l1NetworkId = l1NetworkDetails && l1NetworkDetails.chainID
    switch (l1NetworkId) {
      case null:
        return null
      case '1':
        return 'Arbitrum One Bridge'
      case '4':
        return 'RinkArby Testnet Bridge'
      default:
        return 'Arbitrum Mainnet Bridge'
    }
  }, [l1NetworkDetails])
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative min-h-heading">
          <Header />

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
