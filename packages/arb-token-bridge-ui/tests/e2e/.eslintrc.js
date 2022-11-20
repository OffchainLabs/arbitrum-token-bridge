const path = require('path')
const synpressPath = path.join(
  process.cwd(),
  '../../node_modules/@synthetixio/synpress'
)

module.exports = {
  extends: `${synpressPath}/.eslintrc.js`,
  rules: {
    // Goes against cypress best practices https://docs.cypress.io/guides/references/best-practices#Selecting-Elements
    'ui-testing/no-css-page-layout-selector': 'off'
  }
}
