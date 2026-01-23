// @ts-check type next.config.js
const path = require('path')

/**
 * @type {import('next').NextConfig}
 **/

module.exports = {
  distDir: 'build',
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  transpilePackages: ['@arbitrum/indexer-provider'],
  experimental: {
    externalDir: true
  },
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    // Resolve peer dependencies for external indexer-provider package
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tanstack/react-query': path.resolve(__dirname, '../../node_modules/@tanstack/react-query'),
      '@ponder/client': path.resolve(__dirname, '../../node_modules/@ponder/client'),
      '@ponder/react': path.resolve(__dirname, '../../node_modules/@ponder/react'),
    }

    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'portal.arbitrum.io'
      }
    ]
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
        source:
          '/:slug((?!^$|api/|_next/|public/|restricted)(?!.*\\.[^/]+$).+)',
        missing: [
          {
            type: 'query',
            key: 'destinationChain'
          },
          {
            type: 'header',
            key: 'accept',
            value: 'image/.*'
          }
        ],
        destination: '/?destinationChain=:slug',
        permanent: true
      }
    ]
  }
}
