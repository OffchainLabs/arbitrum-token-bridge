/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
module.exports = {
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  bracketSpacing: true,
  arrowParens: 'avoid',
  trailingComma: 'none',

  // Plugins
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindConfig: require('./tailwind.config.mjs')
}
