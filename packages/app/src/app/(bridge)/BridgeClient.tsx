'use client'
import {
  isE2eTestingEnvironment,
  isProductionEnvironment
} from '@/bridge/util/CommonUtils'
import { initializeSentry } from '@/bridge/util/SentryUtils'
import posthog from 'posthog-js'
import {
  addOrbitChainsToArbitrumSDK,
  initializeDayjs
} from '../../initialization'
import { ComponentType } from 'react'
import { registerLocalNetwork } from '@/bridge/util/networks'
import dynamic from 'next/dynamic'

// Configure dayjs plugins
initializeDayjs()

// Initialize Sentry for error tracking
initializeSentry(process.env.NEXT_PUBLIC_SENTRY_DSN)

// Initialize PostHog
if (typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === 'string') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    loaded: posthog => {
      if (!isProductionEnvironment) {
        // when in dev, you can see data that would be sent in prod (in devtools)
        posthog.debug()
      }
    },
    // store data in temporary memory that expires with each session
    persistence: 'memory',
    // by default posthog autocaptures (sends) events such as onClick, etc
    // we set up our own events instead
    autocapture: false,
    disable_session_recording: true
  })
}

const App = dynamic(() => {
  return new Promise<{ default: ComponentType }>(async resolve => {
    if (!isProductionEnvironment || isE2eTestingEnvironment) {
      await registerLocalNetwork()
    }

    addOrbitChainsToArbitrumSDK()
    const AppComponent = await import('@/bridge/components/App/App')
    resolve(AppComponent)
  })
})

export default function Index() {
  return <App />
}
