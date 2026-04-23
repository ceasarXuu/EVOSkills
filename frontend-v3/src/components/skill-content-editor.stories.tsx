import type { Meta, StoryObj } from '@storybook/react-vite'
import { SkillContentEditor } from '@/components/skill-content-editor'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'
import {
  storyApplyPreview,
  storySkillDetail,
  storySkillInstances,
} from '@/stories/dashboard-v3-fixtures'

const meta = {
  title: 'Dashboard V3/SkillContentEditor',
  component: SkillContentEditor,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <DashboardStoryFrame width="840px">
        <Story />
      </DashboardStoryFrame>
    ),
  ],
} satisfies Meta<typeof SkillContentEditor>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    actionMessage: null,
    applyPreview: null,
    detailError: null,
    draftContent: storySkillDetail.content,
    isApplying: false,
    isSaving: false,
    onApplyToFamily: () => undefined,
    onDraftChange: () => undefined,
    onLoadApplyPreview: () => undefined,
    onSave: () => undefined,
    preferredRuntime: 'claude',
    selectedInstance: storySkillInstances[0],
  },
}

export const WithApplyPreview: Story = {
  args: {
    ...Default.args,
    actionMessage: '已自动保存草稿。',
    applyPreview: storyApplyPreview,
  },
}

export const Error: Story = {
  args: {
    ...Default.args,
    detailError: '正文读取失败，请稍后重试。',
  },
}
