import type { AppProps } from 'next/app'
import Head from 'next/head'
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/browser'
import posthog from 'posthog-js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timeZone from 'dayjs/plugin/timezone'

import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'

import '@rainbow-me/rainbowkit/styles.css'

import { registerLocalNetwork } from '../util/networks'
import { Layout } from '../components/common/Layout'
import { siteTitle } from './_document'

import '../styles/tailwind.css'
import '../styles/purple.css'

if (
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_IS_E2E_TEST
) {
  registerLocalNetwork()
}

dayjs.extend(relativeTime)
dayjs.extend(timeZone)
dayjs.extend(advancedFormat)

Sentry.init({
  environment: process.env.NODE_ENV,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.025,
  maxValueLength: 0,
  beforeSend: event => {
    if (event.message) {
      if (
        // Ignore events related to failed `eth_gasPrice` calls
        event.message.match(/eth_gasPrice/i) ||
        // Ignore events related to failed `eth_getBalance` calls
        event.message.match(/eth_getBalance/i)
      ) {
        return null
      }
    }

    return event
  }
})

if (
  typeof window !== 'undefined' &&
  typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === 'string'
) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    loaded: posthog => {
      if (process.env.NODE_ENV !== 'production') {
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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{siteTitle}</title>
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}
