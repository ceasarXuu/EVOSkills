import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ComponentProps } from 'react'
import { expect, fn, within } from 'storybook/test'
import { SkillContentEditor } from '@/components/skill-content-editor'
import { dashboardStoryParameters } from '@/stories/dashboard-storybook'
import {
  storyApplyPreview,
  storySkillDetail,
  storySkillInstances,
  storySkillVersions,
} from '@/stories/dashboard-v3-fixtures'

type SkillContentEditorStoryArgs = ComponentProps<typeof SkillContentEditor>

function InteractiveSkillContentEditor(args: SkillContentEditorStoryArgs) {
  const [applyPreview, setApplyPreview] = useState(args.applyPreview)
  const [draftContent, setDraftContent] = useState(args.draftContent)

  return (
    <SkillContentEditor
      {...args}
      applyPreview={applyPreview}
      draftContent={draftContent}
      onCloseApplyPreview={() => {
        setApplyPreview(null)
        args.onCloseApplyPreview()
      }}
      onDraftChange={(value) => {
        setDraftContent(value)
        args.onDraftChange(value)
      }}
    />
  )
}

const meta = {
  title: 'Dashboard V3/Skills/SkillContentEditor',
  component: SkillContentEditor,
  tags: ['stable', 'pattern'],
  parameters: dashboardStoryParameters({
    width: '840px',
  }),
  args: {
    actionMessage: null,
    applyPreview: null,
    detail: storySkillDetail,
    detailError: null,
    diffContent: null,
    diffVersion: null,
    draftContent: storySkillDetail.content,
    isApplying: false,
    isSaving: false,
    onApplyToFamily: fn(),
    onCloseApplyPreview: fn(),
    onDraftChange: fn(),
    onLoadApplyPreview: fn(),
    onSelectDiffVersion: fn(),
    onSelectVersion: fn(),
    onSave: fn(),
    onToggleVersionDisabled: fn(),
    preferredRuntime: 'claude',
    selectedInstance: storySkillInstances[0],
    selectedVersion: 6,
    versionMetadataByNumber: storySkillVersions,
  },
} satisfies Meta<typeof SkillContentEditor>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <InteractiveSkillContentEditor {...args} />,
}

export const HeaderToolbar: Story = {
  render: (args) => <InteractiveSkillContentEditor {...args} />,
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    const documentScope = within(canvasElement.ownerDocument.body)

    await expect(canvas.getByRole('combobox', { name: '选择查看版本' })).toBeInTheDocument()
    await expect(canvas.getByRole('combobox', { name: '选择对比版本' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: '预览传播' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: '保存正文' })).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('combobox', { name: '选择查看版本' }))
    await userEvent.click(documentScope.getByRole('option', { name: 'v5' }))
    await expect(args.onSelectVersion).toHaveBeenCalledWith(5)
  },
}

export const WithActionMessage: Story = {
  args: {
    actionMessage: '已自动保存草稿。',
  },
  render: (args) => <InteractiveSkillContentEditor {...args} />,
}

export const ApplyPreviewDialog: Story = {
  args: {
    applyPreview: storyApplyPreview,
  },
  render: (args) => <InteractiveSkillContentEditor {...args} />,
  play: async ({ args, canvasElement, userEvent }) => {
    const documentScope = within(canvasElement.ownerDocument.body)

    await expect(documentScope.getByRole('dialog')).toBeInTheDocument()
    await expect(documentScope.getByText('将影响 2 个同族实例')).toBeInTheDocument()
    await expect(documentScope.getByText('/Users/xuzhang/OrnnSkills')).toBeInTheDocument()

    await userEvent.click(documentScope.getByRole('button', { name: '应用到同族实例' }))
    await expect(args.onApplyToFamily).toHaveBeenCalled()

    await userEvent.click(documentScope.getByRole('button', { name: '取消' }))
    await expect(args.onCloseApplyPreview).toHaveBeenCalled()
  },
}

export const DiffMode: Story = {
  args: {
    diffContent:
      '---\nname: astartes-coding-custodes\n---\n\n# Astartes Coding Custodes\n\nKeep implementation staged.',
    diffVersion: 5,
  },
  render: (args) => <InteractiveSkillContentEditor {...args} />,
}

export const Error: Story = {
  args: {
    detailError: '正文读取失败，请稍后重试。',
  },
  render: (args) => <InteractiveSkillContentEditor {...args} />,
}
