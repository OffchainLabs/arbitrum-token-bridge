// @ts-check type next.config.js

const path = require('path')

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  distDir: 'build',
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Resolve React to a single version if there's a dependency conflict
    config.resolve.alias['react'] = path.resolve('../../node_modules/react')
    config.resolve.alias['react-dom'] = path.resolve(
      '../../node_modules/react-dom'
    )

    return config
  }
}
