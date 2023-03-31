module.exports = {
  plugins: ["@typescript-eslint", "jest"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:jest/recommended",
    "next",
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
    next: {
      rootDir: "packages/arb-token-bridge-ui/",
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
