import React from 'react'
import Loader from 'react-loader-spinner'
import dynamic from 'next/dynamic'

const App = dynamic(() => import('../components/App/App'), {
  ssr: false,
  loading: () => (
    <div className="mt-6 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-8">
      <Loader type="TailSpin" color="white" width={44} height={44} />
    </div>
  )
})

export default function Index() {
  return <App />
}
