import { globalIgnores } from 'eslint/config'
import path from 'path'
import { fileURLToPath } from 'url'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import zustandRules from 'eslint-plugin-zustand-rules'
import tsParser from '@typescript-eslint/parser'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import { flatConfig as nextFlatConfig } from '@next/eslint-plugin-next'
import tseslint from 'typescript-eslint'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default [
  ...tseslint.configs.recommended,
  prettierRecommended,
  nextFlatConfig.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],

    plugins: {
      '@typescript-eslint': typescriptEslint,
      'zustand-rules': zustandRules
    },

    languageOptions: {
      parser: tsParser,
      sourceType: 'module',

      parserOptions: {
        project: ['./tsconfig.eslint.json', './packages/**/tsconfig.json'],
        tsconfigRootDir: __dirname
      }
    },

    settings: {
      react: {
        version: 'detect'
      },

      next: {
        rootDir: 'packages/app/'
      }
    },

    rules: {
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          caughtErrors: 'none',
          ignoreRestSiblings: false,
          reportUsedIgnorePattern: false
        }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': 'allow-with-description',
          'ts-check': 'allow-with-description'
        }
      ],

      '@typescript-eslint/await-thenable': 'error',

      'zustand-rules/use-store-selectors': 'error',
      'zustand-rules/no-state-mutation': 'error',
      'zustand-rules/enforce-use-setstate': 'error',

      '@next/next/no-html-link-for-pages': [
        'error',
        [
          path.join(__dirname, '/packages/arb-token-bridge-ui/src/components'),
          path.join(__dirname, '/packages/app/pages')
        ]
      ]
    }
  },
  {
    files: ['**/tests/e2e/**/*.ts', '**/tests/support/**/*.js'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: ['packages/arb-token-bridge-ui/tests/tsconfig.json']
      }
    },
    rules: {
      // Cypress awaiting by default
      'no-debugger': 0,
      'no-console': 0,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          caughtErrors: 'none',
          ignoreRestSiblings: false,
          reportUsedIgnorePattern: false
        }
      ],
      '@typescript-eslint/no-empty-function': 'off'
    }
  },

  globalIgnores([
    '**/node_modules',
    '**/dist',
    '**/build/',
    '**/.next/',
    '.github/',
    '**/cypress/'
  ])
]
