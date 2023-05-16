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

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
