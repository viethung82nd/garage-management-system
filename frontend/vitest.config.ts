import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Separate from vite.config.ts so the app's build config stays untouched;
// this just points Vitest at the same plugins (for JSX/TS transform) plus
// test-only settings (jsdom + RTL/jest-dom setup).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: false,
  },
})
