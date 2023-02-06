module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack']
    })

    return config
  },
  // https://nextjs.org/docs/api-reference/next.config.js/exportPathMap#adding-a-trailing-slash
  trailingSlash: true,
  productionBrowserSourceMaps: true
}
