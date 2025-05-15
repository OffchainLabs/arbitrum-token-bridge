import { defineConfig, globalIgnores } from "eslint/config";
import path from "path";
import { fileURLToPath } from "url";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import zustandRules from "eslint-plugin-zustand-rules";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";

import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    env: {
      node: true,
    },

    files: [
      "/packages/arb-token-bridge-ui/src/**/*.js",
      "/packages/arb-token-bridge-ui/src/**/*.ts",
      "/packages/arb-token-bridge-ui/src/**/*.tsx",
    ],

    plugins: {
      "@typescript-eslint": typescriptEslint,
      "zustand-rules": zustandRules,
    },

    extends: compat.extends(
      "plugin:@typescript-eslint/recommended",
      "plugin:prettier/recommended",
      "next"
    ),

    languageOptions: {
      parser: tsParser,
      sourceType: "module",

      parserOptions: {
        project: ["./tsconfig.eslint.json", "./packages/*/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
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
      "@typescript-eslint/no-unused-vars": "error",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": "allow-with-description",
          "ts-check": "allow-with-description",
        },
      ],

      "zustand-rules/use-store-selectors": "error",
      "zustand-rules/no-state-mutation": "error",
      "zustand-rules/enforce-use-setstate": "error",
    },
  },
  globalIgnores([
    "**/node_modules",
    "**/dist",
    "**/synpress.config.ts",
    "**/tailwind.config.js",
    "packages/arb-token-bridge/craco.config.js",
    "packages/arb-token-bridge/prettier.config.js",
    "packages/arb-token-bridge/build/static/js/*.js",
    "packages/arb-token-bridge/tests/**/*.ts",
  ]),
];
