import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Flat ESLint config for the frontend (TypeScript + React 19 + Vite).
 *
 * This is intentionally lenient: the goal is a working linter the team can
 * run (`npm run lint`), not a hard gate on the existing codebase. The
 * codebase deliberately mixes two style dialects (an older section and a
 * newer one), so stylistic/strictness rules are `warn` rather than `error`
 * and TypeScript's type-aware "strict"/"stylistic" presets are skipped in
 * favor of the plain `recommended` one, which is far less likely to flag
 * pre-existing code as broken.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // eslint-plugin-react-hooks v7's "recommended" bundles the new React
      // Compiler readiness rules (purity/immutability/set-state-in-effect/
      // etc.) as hard errors. Those flag long-standing, otherwise-correct
      // patterns (setState-to-sync-props in an effect, mutating a local
      // accumulator while mapping, `Date.now()` in render, ...) that are
      // common throughout this codebase. Keep the one rule that catches
      // actual hook-order bugs as an error; everything else in the preset
      // is downgraded to a warning so the linter reports on it without
      // failing the build.
      ...Object.fromEntries(
        Object.entries(reactHooks.configs.recommended.rules).map(([name, severity]) => [
          name,
          name === 'react-hooks/rules-of-hooks' ? severity : 'warn',
        ]),
      ),
      'react-refresh/only-export-components': 'warn',

      // Downgrade from the TS "recommended" preset's errors to warnings so
      // `npm run lint` stays informative rather than a hard gate on code
      // written before this config existed.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.vitest,
      },
    },
  },
)
