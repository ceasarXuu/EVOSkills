import type { Meta, StoryObj } from '@storybook/react-vite'
import { SkillVersionHistory } from '@/components/skill-version-history'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'
import {
  storySkillDetail,
  storySkillInstances,
  storySkillVersions,
} from '@/stories/dashboard-v3-fixtures'

const meta = {
  title: 'Dashboard V3/SkillVersionHistory',
  component: SkillVersionHistory,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <DashboardStoryFrame width="420px">
        <Story />
      </DashboardStoryFrame>
    ),
  ],
} satisfies Meta<typeof SkillVersionHistory>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    detail: storySkillDetail,
    onSelectVersion: () => undefined,
    onToggleVersionDisabled: () => undefined,
    selectedInstance: storySkillInstances[0],
    selectedVersion: 6,
    versionMetadataByNumber: storySkillVersions,
  },
}

export const Empty: Story = {
  args: {
    detail: {
      ...storySkillDetail,
      versions: [],
    },
    onSelectVersion: () => undefined,
    onToggleVersionDisabled: () => undefined,
    selectedInstance: storySkillInstances[0],
    selectedVersion: null,
    versionMetadataByNumber: {},
  },
}
