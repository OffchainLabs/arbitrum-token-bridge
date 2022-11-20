const eslintCommon = require('../../eslintrc')

module.exports = {
  ...eslintCommon,
  rules: {
    ...eslintCommon.rules,
    'ui-testing/no-css-page-layout-selector': 'off'
  }
}
