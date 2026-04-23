import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProjectRail } from '@/components/project-rail'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'
import { storyProjects } from '@/stories/dashboard-v3-fixtures'

const meta = {
  title: 'Dashboard V3/ProjectRail',
  component: ProjectRail,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <DashboardStoryFrame width="360px">
        <Story />
      </DashboardStoryFrame>
    ),
  ],
} satisfies Meta<typeof ProjectRail>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isLoading: false,
    onSelect: () => undefined,
    projects: storyProjects,
    selectedProjectId: '/Users/xuzhang/OrnnSkills',
  },
}

export const Loading: Story = {
  args: {
    isLoading: true,
    onSelect: () => undefined,
    projects: [],
    selectedProjectId: '',
  },
}

export const Empty: Story = {
  args: {
    isLoading: false,
    onSelect: () => undefined,
    projects: [],
    selectedProjectId: '',
  },
}
