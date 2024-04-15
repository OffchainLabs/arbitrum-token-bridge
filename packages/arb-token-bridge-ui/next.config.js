// @ts-check type next.config.js

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  distDir: 'build',
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
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
  }
}
