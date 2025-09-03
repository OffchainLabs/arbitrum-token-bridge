module.exports = {
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  bracketSpacing: true,
  arrowParens: 'avoid',
  trailingComma: 'none',

  // Plugins
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('prettier-plugin-tailwindcss')]
}
