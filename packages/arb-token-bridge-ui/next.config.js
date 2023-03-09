module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack']
    })

    return config
  },

  distDir: 'build',
  productionBrowserSourceMaps: true
}

// https://nextjs.org/docs/advanced-features/security-headers
// https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self';"
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  }
]

module.exports = {
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: securityHeaders
      }
    ]
  }
}
