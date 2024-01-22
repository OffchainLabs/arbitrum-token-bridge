import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { addCustomChain, addCustomNetwork } from '@arbitrum/sdk'

import {
  getCustomChainsFromLocalStorage,
  mapCustomChainToNetworkData
} from '../util/networks'
import { getOrbitChains } from '../util/orbitChainsList'

const App = dynamic(() => import('../components/App/App'), { ssr: false })

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
