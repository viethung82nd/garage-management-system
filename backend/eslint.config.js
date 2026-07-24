import js from "@eslint/js";
import globals from "globals";

/**
 * Flat ESLint config for the backend (Node + ESM).
 *
 * This is intentionally lenient: the goal is a working linter the team can
 * run (`npm run lint`), not a hard gate on the existing codebase. Stylistic
 * rules are `warn` (or off, left to Prettier) rather than `error` so this
 * doesn't turn into a blocking CI step against ~130 existing source files
 * that were never linted before. Correctness rules that are cheap/safe on a
 * legacy codebase (no-undef, no-unused-vars, etc.) stay on but as warnings.
 */
export default [
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Downgrade the handful of recommended rules that are noisiest on an
      // existing, unlinted codebase from "error" to "warn" so `npm run lint`
      // stays informative instead of failing the build outright.
      "no-unused-vars": [
        "warn",
        { args: "none", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-empty": "warn",
      "no-constant-condition": ["warn", { checkLoops: false }],
      "no-useless-escape": "warn",
      "no-case-declarations": "warn",
      "no-useless-assignment": "warn",
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
  },
];
