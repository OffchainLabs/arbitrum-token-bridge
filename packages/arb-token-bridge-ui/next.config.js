// @ts-check type next.config.js

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  webpack(config) {
    if (process.env.NODE_ENV === 'test') {
      config.module.rules.push({
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack']
      })
    }

    return config
  },
  distDir: 'build',
  productionBrowserSourceMaps: true
}
