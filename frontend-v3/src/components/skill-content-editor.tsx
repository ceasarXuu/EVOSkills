import { LinkCircle02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { SkillVersionDiffViewer } from '@/components/skill-version-diff-viewer'
import { SkillVersionHistory } from '@/components/skill-version-history'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/lib/i18n'
import type {
  DashboardSkillApplyPreview,
  DashboardSkillDetail,
  DashboardSkillInstance,
  DashboardSkillVersionMetadata,
  SkillDomainRuntime,
} from '@/types/dashboard'

interface SkillContentEditorProps {
  actionMessage: string | null
  applyPreview: DashboardSkillApplyPreview | null
  detailError: string | null
  diffContent: string | null
  diffVersion: number | null
  draftContent: string
  detail: DashboardSkillDetail | null
  isApplying: boolean
  isSaving: boolean
  onApplyToFamily: () => void
  onCloseApplyPreview: () => void
  onDraftChange: (value: string) => void
  onLoadApplyPreview: () => void
  onSelectDiffVersion: (version: number | null) => void
  onSelectVersion: (version: number) => void
  onSave: () => void
  preferredRuntime: SkillDomainRuntime
  selectedInstance: DashboardSkillInstance | null
  selectedVersion: number | null
  onToggleVersionDisabled: (version: number, disabled: boolean) => void
  versionMetadataByNumber: Record<number, DashboardSkillVersionMetadata>
}

export function SkillContentEditor({
  actionMessage,
  applyPreview,
  detailError,
  diffContent,
  diffVersion,
  draftContent,
  detail,
  isApplying,
  isSaving,
  onApplyToFamily,
  onCloseApplyPreview,
  onDraftChange,
  onLoadApplyPreview,
  onSelectDiffVersion,
  onSelectVersion,
  onSave,
  onToggleVersionDisabled,
  preferredRuntime,
  selectedInstance,
  selectedVersion,
  versionMetadataByNumber,
}: SkillContentEditorProps) {
  const { locale, t } = useI18n()
  const isDiffMode = diffVersion !== null && diffContent !== null

  return (
    <>
      <Card className="border-border/70 bg-card/92">
        <CardHeader className="gap-4 border-b border-border/70">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-1">
              <CardTitle>{t('skillContent')}</CardTitle>
              <div className="truncate text-sm text-muted-foreground">
                {selectedInstance?.projectPath ?? t('noSkillInstance')} · {selectedInstance?.runtime ?? preferredRuntime}
              </div>
              {isDiffMode ? (
                <div className="text-xs text-muted-foreground">
                  {t('diffView')} v{diffVersion} {'->'} v{selectedVersion ?? '--'}
                </div>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <SkillVersionHistory
                detail={detail}
                diffVersion={diffVersion}
                onSelectDiffVersion={onSelectDiffVersion}
                onSelectVersion={onSelectVersion}
                onToggleVersionDisabled={onToggleVersionDisabled}
                selectedInstance={selectedInstance}
                selectedVersion={selectedVersion}
                versionMetadataByNumber={versionMetadataByNumber}
              />
              <Button className="h-10 rounded-xl" onClick={() => void onLoadApplyPreview()} size="sm" variant="outline">
                {t('previewPropagation')}
              </Button>
              <Button className="h-10 rounded-xl" disabled={isSaving || isDiffMode} onClick={() => void onSave()} size="sm">
                {isSaving ? t('saving') : t('saveSkillContent')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {detailError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {detailError}
            </div>
          ) : null}

          {isDiffMode ? (
            <SkillVersionDiffViewer
              newContent={draftContent}
              newVersion={selectedVersion}
              oldContent={diffContent}
              oldVersion={diffVersion}
            />
          ) : (
            <Textarea
              aria-label={t('skillContentAria')}
              className="min-h-[420px] rounded-xl border-border/80 bg-background/60 font-mono text-sm"
              onChange={(event) => onDraftChange(event.target.value)}
              value={draftContent}
            />
          )}

          {actionMessage ? (
            <div className="text-sm text-muted-foreground">
              {translateActionMessage(actionMessage, locale, t)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog onOpenChange={(open) => { if (!open) onCloseApplyPreview() }} open={Boolean(applyPreview)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={LinkCircle02Icon} size={16} strokeWidth={1.8} />
              {locale.startsWith('zh')
                ? `将影响 ${applyPreview?.totalTargets ?? 0} 个同族实例`
                : `Affects ${applyPreview?.totalTargets ?? 0} family instances`}
            </DialogTitle>
            <DialogDescription>
              {locale.startsWith('zh') ? '确认后会把当前正文应用到下列同族实例。' : 'Confirm to apply the current content to these family instances.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-border/70 bg-background/45 p-3" tabIndex={0}>
            {(applyPreview?.targets ?? []).map((target) => (
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground" key={`${target.projectPath}:${target.runtime}`}>
                  <span>{target.projectPath}</span>
                  <span>{target.runtime}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={onCloseApplyPreview} type="button" variant="outline">
              {locale.startsWith('zh') ? '取消' : 'Cancel'}
            </Button>
            <Button disabled={isApplying} onClick={() => void onApplyToFamily()} type="button">
              {isApplying ? t('applying') : t('applyToFamily')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function translateActionMessage(
  message: string,
  locale: string,
  t: ReturnType<typeof useI18n>['t'],
) {
  if (locale.startsWith('zh')) return message
  if (message === '保存中') return t('saving')
  if (message === '没有正文变更') return 'No content changes'
  if (message.startsWith('已保存 v')) return message.replace('已保存', 'Saved')
  if (message.startsWith('已停用 v')) return message.replace('已停用', 'Disabled')
  if (message.startsWith('已恢复 v')) return message.replace('已恢复', 'Restored')
  return message
}
