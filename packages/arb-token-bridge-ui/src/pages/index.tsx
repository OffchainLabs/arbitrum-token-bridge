import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { addCustomChain, addCustomNetwork } from '@arbitrum/sdk'

import { AppConnectionFallbackContainer } from '../components/App/AppConnectionFallbackContainer'
import { Loader } from '../components/common/atoms/Loader'
import { getCustomChainsFromLocalStorage } from '../util/networks'
import { mapCustomChainToNetworkData } from '../util/networks'
import { getOrbitChains } from '../util/orbitChainsList'

const App = dynamic(() => import('../components/App/App'), {
  ssr: false,
  loading: () => (
    <AppConnectionFallbackContainer>
      <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
        <Loader size="large" color="white" />
      </div>
    </AppConnectionFallbackContainer>
  )
})

export default function Index() {
  useEffect(() => {
    const customOrbitChainsToBeAdded = getCustomChainsFromLocalStorage()

    const chainsToBeAdded = [
      ...getOrbitChains(),
      ...customOrbitChainsToBeAdded
    ]
    // user-added custom chains do not persists between sessions
    // we add locally stored custom chains
    chainsToBeAdded.forEach(chain => {
      try {
        addCustomChain({ customChain: chain })
        mapCustomChainToNetworkData(chain)
      } catch (_) {
        // already added
      }

      try {
        // adding to L2 networks too to be fully compatible with the sdk
        addCustomNetwork({ customL2Network: chain })
      } catch (_) {
        // already added
      }
    })
  }, [])

  return <App />
}
