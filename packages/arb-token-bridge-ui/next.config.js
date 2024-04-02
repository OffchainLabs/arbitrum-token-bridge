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
          { key: 'Access-Control-Allow-Credentials', value: 'false' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date'
          }
        ]
      }
    ]
  }
}
