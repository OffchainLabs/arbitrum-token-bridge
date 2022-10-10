const path = require('path')
const synpressPath = path.resolve('../../node_modules/@synthetixio/synpress')

module.exports = {
  extends: `${synpressPath}/.eslintrc.js`,
  parserOptions: {
    project: path.resolve('./tsconfig.json')
  }
}
