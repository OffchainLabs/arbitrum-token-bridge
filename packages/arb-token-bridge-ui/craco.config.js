const webpack = require("webpack")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin

module.exports = function ({ env }) {
  const isProductionBuild = process.env.NODE_ENV === "production"
  const analyzerMode = process.env.REACT_APP_INTERACTIVE_ANALYZE
    ? "server"
    : "static" // : "json"

  const plugins = []

  if (isProductionBuild) {
    plugins.push(new BundleAnalyzerPlugin({ analyzerMode }))
  }

  return {
    webpack: {
      plugins,
    },
    style: {
      postcss: {
        plugins: [require('tailwindcss'), require('autoprefixer')]
      },
    },
  }
}