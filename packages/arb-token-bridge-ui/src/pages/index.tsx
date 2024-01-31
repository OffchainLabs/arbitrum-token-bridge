import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { addCustomChain, addCustomNetwork } from '@arbitrum/sdk'

import { AppConnectionFallbackContainer } from '../components/App/AppConnectionFallbackContainer'
import { Loader } from '../components/common/atoms/Loader'
import {
  getCustomChainsFromLocalStorage,
  mapCustomChainToNetworkData
} from '../util/networks'
import { getOrbitChains } from '../util/orbitChainsList'

const App = dynamic(() => import('./experiment'), {
  ssr: false,
  loading: () => null
})

export default function Index() {
  useEffect(() => {
    ;[...getOrbitChains(), ...getCustomChainsFromLocalStorage()].forEach(
      chain => {
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
      }
    )
  }, [])

  return <App />
}
