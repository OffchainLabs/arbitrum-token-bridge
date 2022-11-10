/* eslint-disable @typescript-eslint/no-var-requires */
const { ESLINT_MODES, whenProd } = require('@craco/craco')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

module.exports = () => {
  const analyzerMode = process.env.REACT_APP_INTERACTIVE_ANALYZE
    ? 'server'
    : 'static' // : "json"

  return {
    webpack: {
      plugins: whenProd(() => [new BundleAnalyzerPlugin({ analyzerMode })])
    },
    style: {
      postcss: {
        plugins: [require('tailwindcss'), require('autoprefixer')]
      }
    },
    eslint: {
      enable: process.env.NODE_ENV !== 'production',
      mode: ESLINT_MODES.file
    }
  }
}
