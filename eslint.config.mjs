import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import globals from 'globals'

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'out/**',
      'build/**',
      '.vscode/**',
      '*.log*',
      'package-lock.json',
      'pnpm-lock.yaml'
    ]
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024
      }
    }
  },
  ...tseslint.configs.recommended
)
