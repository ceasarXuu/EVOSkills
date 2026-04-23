import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConfigProviderRow } from '@/components/config-provider-row'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'
import {
  storyConnectivityResults,
  storyDashboardConfig,
  storyProviderCatalog,
} from '@/stories/dashboard-v3-fixtures'

const provider = storyDashboardConfig.providers[0]

const meta = {
  title: 'Dashboard V3/ConfigProviderRow',
  component: ConfigProviderRow,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <DashboardStoryFrame width="1280px">
        <Story />
      </DashboardStoryFrame>
    ),
  ],
} satisfies Meta<typeof ConfigProviderRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    index: 0,
    isApiKeyVisible: false,
    isCheckingConnectivity: false,
    onCheckConnectivity: () => undefined,
    onRemove: () => undefined,
    onSetDefaultProvider: () => undefined,
    onToggleApiKeyVisibility: () => undefined,
    onUpdate: () => undefined,
    provider,
    providerCatalog: storyProviderCatalog,
    result: storyConnectivityResults[0],
    selectedDefaultProvider: provider.provider,
  },
}

export const ApiKeyVisible: Story = {
  args: {
    ...Default.args,
    isApiKeyVisible: true,
    provider: {
      ...provider,
      apiKey: 'sk-redacted-storybook',
    },
  },
}

export const Checking: Story = {
  args: {
    ...Default.args,
    isCheckingConnectivity: true,
  },
}
