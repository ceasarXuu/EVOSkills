import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SkillFamilyList } from '@/components/skill-family-list'
import { DashboardStoryFrame } from '@/stories/dashboard-story-frame'
import { storySkillFamilies } from '@/stories/dashboard-v3-fixtures'

function InteractiveSkillFamilyList() {
  const [query, setQuery] = useState('')
  const [selectedFamilyId, setSelectedFamilyId] = useState(storySkillFamilies[0]?.familyId ?? '')

  return (
    <SkillFamilyList
      families={storySkillFamilies}
      isLoading={false}
      onQueryChange={setQuery}
      onSelectFamily={setSelectedFamilyId}
      query={query}
      selectedFamilyId={selectedFamilyId}
    />
  )
}

const meta = {
  title: 'Dashboard V3/SkillFamilyList',
  component: SkillFamilyList,
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
} satisfies Meta<typeof SkillFamilyList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    families: storySkillFamilies,
    isLoading: false,
    onQueryChange: () => undefined,
    onSelectFamily: () => undefined,
    query: '',
    selectedFamilyId: storySkillFamilies[0]?.familyId ?? '',
  },
  render: () => <InteractiveSkillFamilyList />,
}

export const Loading: Story = {
  args: {
    families: [],
    isLoading: true,
    onQueryChange: () => undefined,
    onSelectFamily: () => undefined,
    query: '',
    selectedFamilyId: '',
  },
}

export const Empty: Story = {
  args: {
    families: [],
    isLoading: false,
    onQueryChange: () => undefined,
    onSelectFamily: () => undefined,
    query: '',
    selectedFamilyId: '',
  },
}
