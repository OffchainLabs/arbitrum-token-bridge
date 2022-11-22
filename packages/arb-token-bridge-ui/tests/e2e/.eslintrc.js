/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const synpressPath = path.join(
  process.cwd(),
  '/node_modules/@synthetixio/synpress'
)

module.exports = {
  extends: `${synpressPath}/.eslintrc.js`,
  parserOptions: {
    project: path.resolve(
      './packages/arb-token-bridge-ui/tests/e2e/tsconfig.json'
    )
  },
  rules: {
    'jest/expect-expect': [
      'off',
      {
        assertFunctionNames: ['expect']
      }
    ]
  }
}
