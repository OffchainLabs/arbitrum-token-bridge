module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  extends: [
    // "eslint:recommended", // TODO - use this? does it conflict with ts rules?
    'plugin:react/recommended', // Uses the recommended rules from @eslint-plugin-react
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from @typescript-eslint/eslint-plugin
    'plugin:prettier/recommended' // Enable
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true // Allows for the parsing of JSX
    }
  },
  ignorePatterns: ['src/util/contracts/*'],
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    'react/display-name': 'off',
    'no-fallthrough': 'error',
    'react/prop-types': [0],
    '@typescript-eslint/explicit-function-return-type': [
      1,
      { allowExpressions: true }
    ]
    // "sort-imports": [1], // it would be nice to use this but doens't autofix
  },
  settings: {
    react: {
      version: 'detect' // Tells eslint-plugin-react to automatically detect the version of React to use
    }
  }
}
