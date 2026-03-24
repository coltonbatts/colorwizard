import { defineConfig } from 'vitest/config'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.claude/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
    resolve: {
        alias: {
            '@': resolve(root),
        },
    },
})
