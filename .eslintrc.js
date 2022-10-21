module.exports = {
  plugins: ["@typescript-eslint", "react"],
  extends: [
    "airbnb-typescript",
    "plugin:prettier/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.eslint.json", "./packages/*/tsconfig.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  rules: {
    "no-param-reassign": "off",
    "import/no-cycle": "off",
    "no-await-in-loop": "off",
    "react/no-unescaped-entities": "off",
    "react/destructuring-assignment": "off",
    // Vscode doesn't support automatically destructuring, it's a pain to add a new variable
    "jsx-a11y/anchor-is-valid": "off",
    // Next.js use his own internal link system
    "react/require-default-props": "off",
    // Allow non-defined react props as undefined
    "react/react-in-jsx-scope": "off",
    "consistent-return": "off",
    "react/jsx-no-bind": "off",
    // not needed in nextjs
    "react/no-array-index-key": "off",
    "react/jsx-props-no-spreading": "off",
    "import/no-extraneous-dependencies": "off",
    "react/self-closing-comp": "off",
    "react/prop-types": "off",
    "no-nested-ternary": "off",
    "react/jsx-one-expression-per-line": "off",
    "jsx-a11y/no-autofocus": "off",
    "jsx-a11y/label-has-associated-control": "off",
    "import/order": [
      "warn",
      {
        groups: ["builtin", "external", "internal"],
        pathGroups: [
          {
            pattern: "react",
            group: "external",
            position: "before",
          },
        ],
        pathGroupsExcludedImportTypes: ["react"],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import/prefer-default-export": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
      },
    ],
    "no-console": "off",
    "no-restricted-syntax": [
      "warn",
      {
        selector:
          "CallExpression[callee.object.name='console'][callee.property.name!=/^(log|warn|error|info|trace)$/]",
        message: "Unexpected property on console object was called",
      },
    ],
  },
};
