import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConfigPromptEditor } from '@/components/config-prompt-editor'
import { CONFIG_TEXT, getPromptDefaults } from '@/lib/config-workspace'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'

const defaults = getPromptDefaults()

const meta = {
  title: 'Dashboard V3/ConfigPromptEditor',
  component: ConfigPromptEditor,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <DashboardStoryFrame width="1120px">
        <Story />
      </DashboardStoryFrame>
    ),
  ],
} satisfies Meta<typeof ConfigPromptEditor>

export default meta

type Story = StoryObj<typeof meta>

export const BuiltIn: Story = {
  args: {
    defaultPrompt: defaults.skillCallAnalyzer,
    label: CONFIG_TEXT.promptSkillCallAnalyzerLabel,
    onSetPromptOverride: () => undefined,
    onSetPromptSource: () => undefined,
    placeholder: CONFIG_TEXT.promptSkillCallAnalyzerPlaceholder,
    promptKey: 'skillCallAnalyzer',
    source: 'built_in',
    value: '',
  },
}

export const Custom: Story = {
  args: {
    ...BuiltIn.args,
    source: 'custom',
    value: 'Classify calls by family, runtime, and evidence.',
  },
}
