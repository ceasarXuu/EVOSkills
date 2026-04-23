import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import viteConfig from './vite.config'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, '.storybook'),
              storybookScript: 'npm run storybook -- --ci --no-open',
              storybookUrl: 'http://127.0.0.1:6006',
              tags: {
                include: ['stable'],
                exclude: ['skip-test'],
              },
            }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({}),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
)
