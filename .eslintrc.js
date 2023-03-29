module.exports = {
  plugins: ["@typescript-eslint", "react", "jsx-a11y", "jest", "prettier"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:jest/recommended",
    "plugin:@next/next/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.eslint.json", "./packages/*/tsconfig.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react/jsx-uses-react": "off", // we're using React 17+ so it's irrelevant
    "react/react-in-jsx-scope": "off", // we're using React 17+ so it's irrelevant
    "@typescript-eslint/explicit-module-boundary-types": "off", // allow type inference for function return type
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": "allow-with-description",
        "ts-nocheck": "allow-with-description",
        "ts-check": "allow-with-description",
      },
    ],
  },
};
