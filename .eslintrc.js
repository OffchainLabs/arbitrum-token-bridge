module.exports = {
  plugins: ["@typescript-eslint", "react", "jsx-a11y", "jest"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:jest/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.eslint.json", "./packages/*/tsconfig.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
};
