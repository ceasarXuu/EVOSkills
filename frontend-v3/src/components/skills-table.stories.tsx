import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SkillsTable } from '@/components/skills-table'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'
import { storyProjectSkills } from '@/stories/dashboard-v3-fixtures'
import type { DashboardSkill } from '@/types/dashboard'

function InteractiveSkillsTable({ skills = storyProjectSkills }) {
  const [query, setQuery] = useState('')
  const [selectedSkillKey, setSelectedSkillKey] = useState('systematic-debugging:codex')

  return (
    <SkillsTable
      isLoading={false}
      onQueryChange={setQuery}
      onSelectSkill={(skill: DashboardSkill) =>
        setSelectedSkillKey(`${skill.skillId}:${skill.runtime ?? 'unknown'}`)
      }
      query={query}
      selectedSkillKey={selectedSkillKey}
      skills={skills}
    />
  )
}

const meta = {
  title: 'Dashboard V3/SkillsTable',
  component: SkillsTable,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <DashboardStoryFrame width="1040px">
        <Story />
      </DashboardStoryFrame>
    ),
  ],
} satisfies Meta<typeof SkillsTable>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isLoading: false,
    onQueryChange: () => undefined,
    onSelectSkill: () => undefined,
    query: '',
    selectedSkillKey: 'systematic-debugging:codex',
    skills: storyProjectSkills,
  },
  render: () => <InteractiveSkillsTable />,
}

export const Loading: Story = {
  args: {
    isLoading: true,
    onQueryChange: () => undefined,
    onSelectSkill: () => undefined,
    query: '',
    selectedSkillKey: '',
    skills: [],
  },
}

export const Empty: Story = {
  args: {
    isLoading: false,
    onQueryChange: () => undefined,
    onSelectSkill: () => undefined,
    query: '',
    selectedSkillKey: '',
    skills: [],
  },
}
