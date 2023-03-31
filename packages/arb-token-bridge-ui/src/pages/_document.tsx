import { Html, Head, Main, NextScript } from 'next/document'
import { useDefaultTheme } from 'src/hooks/useTheme'

export default function Document() {
  const defaultTheme = useDefaultTheme()
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />

        <link rel="icon" href="/logo.png" />

        <meta name="theme-color" content="#000000" />
        <meta
          name="description"
          content="Built to scale Ethereum, Arbitrum brings you 10x lower costs while inheriting Ethereum’s security model. Arbitrum is a Layer 2 Optimistic Rollup."
        />

        {/* Fathom Analytics */}
        <script
          src="https://imaginative-hearty.arbitrum.io/script.js"
          data-site="SKOIAJUL"
          defer
        />
      </Head>
      <body className={defaultTheme}>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
