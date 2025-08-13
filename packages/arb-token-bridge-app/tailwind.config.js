/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rootConfig = require('../../tailwind.config.js')

module.exports = {
  ...rootConfig,
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    '../arb-token-bridge-ui/src/**/*.{js,ts,jsx,tsx}',
    '../../node_modules/@offchainlabs/cobalt/**/*.{js,ts,jsx,tsx}'
  ]
}
