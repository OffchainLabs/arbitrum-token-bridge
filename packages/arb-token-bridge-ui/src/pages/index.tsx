import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { addCustomNetwork } from '@arbitrum/sdk'

import { AppConnectionFallbackContainer } from '../components/App/AppConnectionFallbackContainer'
import { Loader } from '../components/common/atoms/Loader'
import {
  getCustomChainsFromLocalStorage,
  xaiTestnet,
  xai
} from '../util/networks'
import { mapCustomChainToNetworkData } from '../util/networks'

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
    // user-added custom chains do not persists between sessions
    // we add locally stored custom chains
    getCustomChainsFromLocalStorage().forEach(chain => {
      try {
        addCustomNetwork({ customL2Network: chain })
        mapCustomChainToNetworkData(chain)
      } catch (_) {
        // already added
      }
    })

    try {
      addCustomNetwork({ customL2Network: xaiTestnet })
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Failed to register Xai Testnet: ${error.message}`)
      }
    }

    try {
      addCustomNetwork({ customL2Network: xai })
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Failed to register Xai: ${error.message}`)
      }
    }
  }, [])

  return <App />
}
