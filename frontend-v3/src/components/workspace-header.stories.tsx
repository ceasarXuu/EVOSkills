import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { WorkspaceHeader } from '@/components/workspace-header'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'

const meta = {
  title: 'Dashboard V3/WorkspaceHeader',
  component: WorkspaceHeader,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/skills']}>
        <DashboardStoryFrame width="100vw">
          <Story />
        </DashboardStoryFrame>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof WorkspaceHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Skills: Story = {
  args: {
    currentView: 'skills',
  },
}

export const Project: Story = {
  args: {
    currentView: 'project',
  },
}

export const Config: Story = {
  args: {
    currentView: 'config',
  },
}
