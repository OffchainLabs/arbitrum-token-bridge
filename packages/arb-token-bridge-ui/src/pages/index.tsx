import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { addCustomChain } from '@arbitrum/sdk'

import { AppConnectionFallbackContainer } from '../components/App/AppConnectionFallbackContainer'
import { Loader } from '../components/common/atoms/Loader'
import { getCustomChainsFromLocalStorage } from '../components/common/AddCustomChain'
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
    try {
      getCustomChainsFromLocalStorage().forEach(chain => {
        addCustomChain({ customChain: chain })
        mapCustomChainToNetworkData(chain)
      })
    } catch {
      // already added
    }
  }, [])

  return <App />
}
