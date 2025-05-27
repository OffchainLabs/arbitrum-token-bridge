/**
 * @see https://prettier.io/docs/configuration
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
  tailwindStylesheet: './src/styles/tailwind.css',
  tailwindFunctions: ['twMerge'],

  // Plugins
  plugins: [import('prettier-plugin-tailwindcss')]
}
