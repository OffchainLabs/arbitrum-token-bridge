import type { AppProps } from 'next/app'
import Head from 'next/head'
import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timeZone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import type { Chain } from 'wagmi'
import { errors } from 'ethers'

import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'

import '@rainbow-me/rainbowkit/styles.css'

import { Layout } from '../components/common/Layout'

import '../styles/tailwind.css'
import {
  ChainKeyQueryParam,
  getChainForChainKeyQueryParam
} from '../types/ChainQueryParam'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { isNetwork } from '../util/networks'

dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(timeZone)
dayjs.extend(advancedFormat)

Sentry.init({
  environment: process.env.NODE_ENV,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.025,
  maxValueLength: 0,
  // https://docs.sentry.io/platforms/javascript/guides/react/configuration/filtering/#filtering-error-events
  ignoreErrors: [
    // Ignore events related to failed `eth_gasPrice` calls
    /eth_gasPrice/i,
    // Ignore events related to failed `eth_getBalance` calls
    /eth_getBalance/i,
    // Ignore events related to failed walletConnect calls
    /Attempt to connect to relay via/i,
    // Ignore events about window.propertyX being redefined accross multiple extensions
    /Cannot redefine property/i,
    // Ignore WC bug until we can update to the latest version, see FS-677
    /^WebSocket connection failed for host: wss:\/\/relay.walletconnect.org$/i
  ],
  beforeSend: (event, hint) => {
    if (!hint.originalException) {
      return event
    }

    if (isUserRejectedError(hint.originalException)) {
      return null
    }

    const { code, message } = hint.originalException as {
      code?: errors
      message?: string
    }

    if (code && message) {
      event.fingerprint = ['{{ default }}', code, message]
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

function DynamicMetaData({
  sourceChainInfo,
  destinationChainInfo
}: {
  sourceChainInfo: Chain
  destinationChainInfo: Chain
}) {
  const { isOrbitChain: isSourceOrbitChain } = isNetwork(sourceChainInfo.id)
  const { isOrbitChain: isDestinationOrbitChain } = isNetwork(
    destinationChainInfo.id
  )

  const siteTitle = `Bridge to ${destinationChainInfo.name}`

  const siteDescription = `Bridge from ${sourceChainInfo.name} to ${destinationChainInfo.name} using the Arbitrum Bridge. Built to scale Ethereum, Arbitrum brings you 10x lower costs while inheriting Ethereum’s security model. Arbitrum is a Layer 2 Optimistic Rollup.`
  const siteDomain = 'https://bridge.arbitrum.io'

  let metaImagePath = `${sourceChainInfo.id}-to-${destinationChainInfo.id}.jpg`

  if (isSourceOrbitChain) {
    metaImagePath = `${sourceChainInfo.id}.jpg`
  }

  if (isDestinationOrbitChain) {
    metaImagePath = `${destinationChainInfo.id}.jpg`
  }

  return (
    <>
      <meta name="description" content={siteDescription} />

      {/* <!-- Facebook Meta Tags --> */}
      <meta name="og:url" property="og:url" content={siteDomain} />
      <meta name="og:type" property="og:type" content="website" />
      <meta name="og:title" property="og:title" content={siteTitle} />
      <meta
        name="og:description"
        property="og:description"
        content={siteDescription}
      />
      <meta
        name="og:image"
        property="og:image"
        content={`${siteDomain}/images/__auto-generated/open-graph/${metaImagePath}`}
      />

      {/* <!-- Twitter Meta Tags --> */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:domain"
        property="twitter:domain"
        content="bridge.arbitrum.io"
      />
      <meta name="twitter:url" property="twitter:url" content={siteDomain} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta
        name="twitter:image"
        content={`${siteDomain}/images/__auto-generated/open-graph/${metaImagePath}`}
      />
    </>
  )
}

export default function App({ Component, pageProps, router }: AppProps) {
  const sourceChainSlug = (router.query.sourceChain?.toString() ??
    'ethereum') as ChainKeyQueryParam
  const destinationChainSlug = (router.query.destinationChain?.toString() ??
    'arbitrum-one') as ChainKeyQueryParam

  let sourceChainInfo
  let destinationChainInfo

  try {
    sourceChainInfo = getChainForChainKeyQueryParam(sourceChainSlug)
    destinationChainInfo = getChainForChainKeyQueryParam(destinationChainSlug)
  } catch (error) {
    // 1. slug misspelling can enter this flow
    // 2. when user selects a custom orbit chain, it will also go to this flow (they are only available in local storage and not on the server)
    sourceChainInfo = getChainForChainKeyQueryParam('ethereum')
    destinationChainInfo = getChainForChainKeyQueryParam('arbitrum-one')
  }

  const siteTitle = `Bridge to ${destinationChainInfo.name}`

  return (
    <>
      <Head>
        <DynamicMetaData
          sourceChainInfo={sourceChainInfo}
          destinationChainInfo={destinationChainInfo}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* title must be here because it doesn't render if it's in DynamicMetaData */}
        <title>{siteTitle}</title>
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}
