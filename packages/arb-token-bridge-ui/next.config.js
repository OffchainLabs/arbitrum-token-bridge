// @ts-check type next.config.js

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  distDir: 'build',
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  // without this, the app would throw an error from cobalt for next/link
  // https://github.com/chakra-ui/chakra-ui/issues/7363#issuecomment-1439466358
  experimental: {
    esmExternals: false
  },
  async headers() {
    return [
      {
        source: '/api/status',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://portal.arbitrum.io'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET'
          }
        ]
      }
    ]
  },
  async redirects() {
    return [
      {
        source: '/:slug((?!transaction-history$).+)',
        destination: '/?destinationChain=:slug',
        permanent: true
      }
    ]
  }
}
