module.exports = {
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  bracketSpacing: true,
  arrowParens: 'avoid',
  trailingComma: 'none',
  tailwindStylesheet: "./src/styles/tailwind.css",
  "tailwindFunctions": ["twMerge"],

  // Plugins
  plugins: ['prettier-plugin-tailwindcss']
}
