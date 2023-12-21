const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './'
})

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/setupTests.ts'],

  // https://jestjs.io/docs/configuration#testmatch-arraystring
  // removed ["**/__tests__/**/*.[jt]s?(x)"] from jest's default testMatch to ignore helpers.ts present in __test__ folders
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)']
}

// Lists out node modules that need to be transformed before running tests
const transformNodeModules = [
  'query-string',
  // The following are dependencies for query-string (https://github.com/sindresorhus/query-string/blob/main/package.json)
  'decode-uri-component',
  'split-on-first',
  'filter-obj',
  // wagmi
  '@wagmi',
  'wagmi'
]

module.exports = async function () {
  const config = await createJestConfig(customJestConfig)()

  return {
    ...config,
    transformIgnorePatterns: [
      `node_modules/(?!(${transformNodeModules.join('|')})/)`,
      '^.+\\.module\\.(css|sass|scss)$'
    ]
  }
}
