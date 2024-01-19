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

import '../styles/tailwind.css'
import '../styles/purple.css'
import { getChainForChainKeyQueryParam } from '../types/ChainQueryParam'

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
  tracesSampleRate: 0.15,
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

function Meta({
  sourceChain,
  destinationChain
}: {
  sourceChain: string
  destinationChain: string
}) {
  const siteTitle = `Bridge from ${sourceChain} to ${destinationChain}`
  const siteDescription = `Bridge from ${sourceChain} to ${destinationChain} using the Arbitrum Bridge. Built to scale Ethereum, Arbitrum brings you 10x lower costs while inheriting Ethereum’s security model. Arbitrum is a Layer 2 Optimistic Rollup.`
  const siteDomain = 'https://bridge.arbitrum.io'

  return (
    <>
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />

      {/* <!-- Facebook Meta Tags --> */}
      <meta property="og:url" content={siteDomain} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:image" content={`${siteDomain}/og-image.jpg`} />

      {/* <!-- Twitter Meta Tags --> */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="bridge.arbitrum.io" />
      <meta property="twitter:url" content={siteDomain} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={`${siteDomain}/og-image.jpg`} />
    </>
  )
}

export default function App({ Component, pageProps, router }: AppProps) {
  const { sourceChain = 'ethereum', destinationChain = 'arbitrum-one' } =
    router.query

  return (
    <>
      <Head>
        <Meta
          sourceChain={getChainForChainKeyQueryParam(sourceChain as any).name}
          destinationChain={
            getChainForChainKeyQueryParam(destinationChain as any).name
          }
        />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}
