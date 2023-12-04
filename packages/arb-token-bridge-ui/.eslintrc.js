const path = require('path')
const basePath = path.join(process.cwd(), '/../..')

module.exports = {
  extends: `${basePath}/.eslintrc.js`,
  parserOptions: {
    project: path.resolve('./tsconfig.json')
  }
}
