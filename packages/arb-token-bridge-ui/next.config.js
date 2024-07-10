// @ts-check type next.config.js

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  distDir: 'build',
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:slug',
        destination: '/?destinationChain=:slug',
        permanent: true
      }
    ]
  }
}
