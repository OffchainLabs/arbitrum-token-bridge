import type { AppProps } from 'next/app'
import Head from 'next/head'
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timeZone from 'dayjs/plugin/timezone'

import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'

import Package from '../../package.json'
import { registerLocalNetwork } from '../util/networks'
import { Layout } from '../components/common/Layout'

import '../styles/tailwind.css'
import '../styles/purple.css'

if (process.env.NODE_ENV !== 'production') {
  registerLocalNetwork()
}

dayjs.extend(relativeTime)
dayjs.extend(timeZone)
dayjs.extend(advancedFormat)

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: Package.version,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.15,
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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Bridge to Arbitrum</title>
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}
