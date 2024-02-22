import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { addCustomNetwork } from '@arbitrum/sdk'

import { AppConnectionFallbackContainer } from '../components/App/AppConnectionFallbackContainer'
import { Loader } from '../components/common/atoms/Loader'
import {
  getCustomChainsFromLocalStorage,
  mapCustomChainToNetworkData
} from '../util/networks'
import { getOrbitChains } from '../util/orbitChainsList'

const App = dynamic(() => import('../components/App/App'), {
  ssr: false,
  loading: () => (
    <>
      <div className="h-12 w-full lg:h-16" />
      <AppConnectionFallbackContainer>
        <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
          <Loader size="large" color="white" />
        </div>
      </AppConnectionFallbackContainer>
    </>
  )
})

export default function Index() {
  useEffect(() => {
    ;[...getOrbitChains(), ...getCustomChainsFromLocalStorage()].forEach(
      chain => {
        try {
          addCustomNetwork({ customL2Network: chain })
          mapCustomChainToNetworkData(chain)
        } catch (_) {
          // already added
        }
      }
    )
  }, [])

  return <App />
}
