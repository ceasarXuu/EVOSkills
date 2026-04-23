import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest', '@chromatic-com/storybook'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (viteConfig) =>
    mergeConfig(viteConfig, {
      base: '/',
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('../src', import.meta.url)),
        },
      },
    }),
}

export default config
