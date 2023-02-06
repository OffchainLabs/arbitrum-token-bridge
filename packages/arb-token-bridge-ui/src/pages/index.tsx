import React from 'react'
import Loader from 'react-loader-spinner'
import dynamic from 'next/dynamic'

import { AppConnectionFallbackContainer } from '../components/App/AppConnectionFallbackContainer'

const App = dynamic(() => import('../components/App/App'), {
  ssr: false,
  loading: () => (
    <AppConnectionFallbackContainer>
      <div className="fixed inset-0 m-auto h-[44px] w-[44px]">
        <Loader type="TailSpin" color="white" height={44} width={44} />
      </div>
    </AppConnectionFallbackContainer>
  )
})

export default function Index() {
  return <App />
}
