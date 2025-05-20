import { globalIgnores, defineConfig } from "eslint/config";
import path from "path";
import { fileURLToPath } from "url";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import zustandRules from "eslint-plugin-zustand-rules";
import tsParser from "@typescript-eslint/parser";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx", "**/*.mjs", "**/*.jsx"],

    plugins: {
      "@typescript-eslint": typescriptEslint,
      "zustand-rules": zustandRules,
    },

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
    "**/build/",
    ".github/",
    "**/tests/",
  ]),
];
