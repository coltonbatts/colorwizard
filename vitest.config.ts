import { defineConfig } from 'vitest/config'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // tsconfig keeps JSX as "preserve" for Next; tests that render a component need the automatic runtime.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'components/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.claude/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
    resolve: {
        alias: {
            '@': resolve(root),
        },
    },
})
