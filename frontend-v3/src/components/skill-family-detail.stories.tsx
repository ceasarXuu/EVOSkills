import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState, type ComponentProps } from 'react'
import { expect, fn, within } from 'storybook/test'
import { SkillFamilyDetail } from '@/components/skill-family-detail'
import { dashboardStoryParameters } from '@/stories/dashboard-storybook'
import {
  storyApplyPreview,
  storyProjects,
  storySkillDetail,
  storySkillFamilies,
  storySkillInstances,
  storySkillVersions,
} from '@/stories/dashboard-v3-fixtures'
import type { DashboardSkillInstance, SkillDomainRuntime } from '@/types/dashboard'

type SkillFamilyDetailStoryArgs = ComponentProps<typeof SkillFamilyDetail> & {
  instances: DashboardSkillInstance[]
}

function InteractiveSkillFamilyDetail(args: SkillFamilyDetailStoryArgs) {
  const { instances, ...componentArgs } = args
  const [draftContent, setDraftContent] = useState(args.draftContent)
  const [preferredProjectPath, setPreferredProjectPath] = useState(args.preferredProjectPath)
  const [preferredRuntime, setPreferredRuntime] = useState<SkillDomainRuntime>(args.preferredRuntime)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(args.selectedVersion)

  const selectedInstance = useMemo(() => {
    return (
      instances.find((instance) => {
        return instance.projectPath === preferredProjectPath && instance.runtime === preferredRuntime
      }) ?? null
    )
  }, [instances, preferredProjectPath, preferredRuntime])

  return (
    <SkillFamilyDetail
      {...componentArgs}
      draftContent={draftContent}
      onDraftChange={(value) => {
        setDraftContent(value)
        args.onDraftChange(value)
      }}
      onPreferredProjectChange={(projectPath) => {
        setPreferredProjectPath(projectPath)
        args.onPreferredProjectChange(projectPath)
      }}
      onSelectVersion={(version) => {
        setSelectedVersion(version)
        args.onSelectVersion(version)
      }}
      onSwitchRuntime={(runtime) => {
        setPreferredRuntime(runtime)
        args.onSwitchRuntime(runtime)
      }}
      preferredProjectPath={preferredProjectPath}
      preferredRuntime={preferredRuntime}
      selectedInstance={selectedInstance}
      selectedVersion={selectedVersion}
    />
  )
}

const meta = {
  title: 'Dashboard V3/Skills/SkillFamilyDetail',
  component: SkillFamilyDetail,
  tags: ['stable', 'screen'],
  parameters: dashboardStoryParameters({
    width: '1280px',
  }),
  args: {
    actionMessage: null,
    applyPreview: storyApplyPreview,
    detail: storySkillDetail,
    detailError: null,
    draftContent: storySkillDetail.content,
    family: storySkillFamilies[0],
    instances: storySkillInstances,
    isApplying: false,
    isLoading: false,
    isSaving: false,
    onApplyToFamily: fn(),
    onDraftChange: fn(),
    onLoadApplyPreview: fn(),
    onPreferredProjectChange: fn(),
    onSave: fn(),
    onSelectVersion: fn(),
    onSwitchRuntime: fn(),
    onToggleVersionDisabled: fn(),
    preferredProjectPath: storyProjects[0].path,
    preferredRuntime: 'claude',
    projects: storyProjects,
    selectedInstance: storySkillInstances[0],
    selectedVersion: 6,
    versionMetadataByNumber: storySkillVersions,
  },
} satisfies Meta<SkillFamilyDetailStoryArgs>

export default meta

type Story = StoryObj<SkillFamilyDetailStoryArgs>

export const Default: Story = {
  render: (args) => <InteractiveSkillFamilyDetail {...args} />,
}

export const FilteredBySelectors: Story = {
  render: (args) => <InteractiveSkillFamilyDetail {...args} />,
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    const documentScope = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole('combobox', { name: '选择优先项目' }))
    await userEvent.click(documentScope.getByRole('option', { name: 'mili' }))
    await expect(args.onPreferredProjectChange).toHaveBeenCalledWith(storyProjects[1].path)

    await userEvent.click(canvas.getByRole('combobox', { name: '切换 runtime' }))
    await userEvent.click(documentScope.getByRole('option', { name: 'codex' }))
    await expect(args.onSwitchRuntime).toHaveBeenCalledWith('codex')

    await expect(canvas.getByText('/Users/xuzhang/mili · codex')).toBeInTheDocument()
  },
}

export const EmptySelection: Story = {
  args: {
    actionMessage: null,
    applyPreview: null,
    detail: null,
    detailError: null,
    draftContent: '',
    family: null,
    instances: [],
    preferredProjectPath: storyProjects[0].path,
    projects: storyProjects,
    selectedInstance: null,
    selectedVersion: null,
    versionMetadataByNumber: {},
  },
  render: (args) => <InteractiveSkillFamilyDetail {...args} />,
}

export const Loading: Story = {
  args: {
    applyPreview: null,
    detail: null,
    draftContent: '',
    family: null,
    instances: [],
    isLoading: true,
    selectedInstance: null,
    selectedVersion: null,
    versionMetadataByNumber: {},
  },
  render: (args) => <InteractiveSkillFamilyDetail {...args} />,
}
