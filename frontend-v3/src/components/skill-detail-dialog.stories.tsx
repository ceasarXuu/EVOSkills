import type { Meta, StoryObj } from '@storybook/react-vite'
import { SkillDetailDialog } from '@/components/skill-detail-dialog'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'
import { storyProjectSkills } from '@/stories/dashboard-v3-fixtures'

const meta = {
  title: 'Dashboard V3/SkillDetailDialog',
  component: SkillDetailDialog,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <DashboardStoryFrame width="720px">
        <Story />
      </DashboardStoryFrame>
    ),
  ],
} satisfies Meta<typeof SkillDetailDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: {
    onOpenChange: () => undefined,
    open: true,
    skill: storyProjectSkills[0],
  },
}

export const Empty: Story = {
  args: {
    onOpenChange: () => undefined,
    open: true,
    skill: null,
  },
}
