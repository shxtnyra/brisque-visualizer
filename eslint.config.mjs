import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'

export default defineConfig(
  {
    root: true,
    ignorePatterns: ['node_modules/', 'dist/', 'out/', 'build/', '.vscode/'],
    env: {
      browser: true,
      node: true,
      es2024: true
    }
  },
  tseslint.configs.recommended,
  eslintConfigPrettier
)
