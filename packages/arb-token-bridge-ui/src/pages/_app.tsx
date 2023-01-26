import type { AppProps } from 'next/app'
import Head from 'next/head'

import '../styles/tailwind.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Bridge to Arbitrum</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
