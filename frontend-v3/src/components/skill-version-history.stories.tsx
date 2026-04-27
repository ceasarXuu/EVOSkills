import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ComponentProps } from 'react'
import { expect, fn, within } from 'storybook/test'
import { SkillVersionHistory } from '@/components/skill-version-history'
import { dashboardStoryParameters } from '@/stories/dashboard-storybook'
import {
  storySkillDetail,
  storySkillInstances,
  storySkillVersions,
} from '@/stories/dashboard-v3-fixtures'

type SkillVersionHistoryStoryArgs = ComponentProps<typeof SkillVersionHistory>

function InteractiveSkillVersionHistory(args: SkillVersionHistoryStoryArgs) {
  const [diffVersion, setDiffVersion] = useState(args.diffVersion)
  const [selectedVersion, setSelectedVersion] = useState(args.selectedVersion)

  return (
    <SkillVersionHistory
      {...args}
      diffVersion={diffVersion}
      onSelectDiffVersion={(version) => {
        setDiffVersion(version)
        args.onSelectDiffVersion(version)
      }}
      onSelectVersion={(version) => {
        setSelectedVersion(version)
        args.onSelectVersion(version)
      }}
      selectedVersion={selectedVersion}
    />
  )
}

const meta = {
  title: 'Dashboard V3/Skills/SkillVersionHistory',
  component: SkillVersionHistory,
  tags: ['stable', 'pattern'],
  parameters: dashboardStoryParameters({
    width: '420px',
  }),
  args: {
    diffVersion: null,
    onSelectDiffVersion: fn(),
    onSelectVersion: fn(),
    onToggleVersionDisabled: fn(),
  },
} satisfies Meta<typeof SkillVersionHistory>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    detail: storySkillDetail,
    selectedInstance: storySkillInstances[0],
    selectedVersion: 6,
    versionMetadataByNumber: storySkillVersions,
  },
}

export const SelectAndClearDiff: Story = {
  args: {
    detail: storySkillDetail,
    selectedInstance: storySkillInstances[0],
    selectedVersion: 6,
    versionMetadataByNumber: storySkillVersions,
  },
  render: (args) => <InteractiveSkillVersionHistory {...args} />,
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    const documentScope = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole('combobox', { name: '选择查看版本' }))
    await userEvent.click(documentScope.getByRole('option', { name: 'v5' }))
    await expect(args.onSelectVersion).toHaveBeenCalledWith(5)

    await userEvent.click(canvas.getByRole('combobox', { name: '选择对比版本' }))
    await userEvent.click(documentScope.getByRole('option', { name: 'v4' }))
    await expect(args.onSelectDiffVersion).toHaveBeenCalledWith(4)

    await userEvent.click(canvas.getByRole('combobox', { name: '选择对比版本' }))
    await userEvent.click(documentScope.getByRole('option', { name: '不对比' }))
    await expect(args.onSelectDiffVersion).toHaveBeenCalledWith(null)
  },
}

export const Comparing: Story = {
  args: {
    detail: storySkillDetail,
    diffVersion: 5,
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
    selectedInstance: storySkillInstances[0],
    selectedVersion: null,
    versionMetadataByNumber: {},
  },
}
