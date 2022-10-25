import React from 'react'

import '../styles.css'
import { Layout } from '../src/components/common/Layout'

export default function App({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
