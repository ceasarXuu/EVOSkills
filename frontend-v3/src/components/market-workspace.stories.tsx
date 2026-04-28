import type { Meta, StoryObj } from '@storybook/react-vite'
import { MarketWorkspace } from '@/components/market-workspace'
import { dashboardStoryParameters } from '@/stories/dashboard-storybook'

const meta = {
  title: 'Dashboard V3/Market/MarketWorkspace',
  component: MarketWorkspace,
  tags: ['stable', 'screen'],
  parameters: dashboardStoryParameters({
    initialEntries: ['/market'],
    layout: 'fullscreen',
    width: '100vw',
  }),
} satisfies Meta<typeof MarketWorkspace>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
