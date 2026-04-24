import { TimeQuarterPassIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDateTime } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type {
  DashboardSkillDetail,
  DashboardSkillInstance,
  DashboardSkillVersionMetadata,
} from '@/types/dashboard'

interface SkillVersionHistoryProps {
  detail: DashboardSkillDetail | null
  onSelectVersion: (version: number) => void
  onToggleVersionDisabled: (version: number, disabled: boolean) => void
  selectedInstance: DashboardSkillInstance | null
  selectedVersion: number | null
  versionMetadataByNumber: Record<number, DashboardSkillVersionMetadata>
}

export function SkillVersionHistory({
  detail,
  onSelectVersion,
  onToggleVersionDisabled,
  selectedInstance,
  selectedVersion,
  versionMetadataByNumber,
}: SkillVersionHistoryProps) {
  const { locale, t } = useI18n()
  const versions = detail?.versions ?? []

  return (
    <Card className="border-border/70 bg-card/92">
      <CardHeader className="gap-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={TimeQuarterPassIcon} size={18} strokeWidth={1.8} />
          <CardTitle>{t('versionHistory')}</CardTitle>
        </div>
        <div className="text-sm text-muted-foreground">
          effective v{detail?.effectiveVersion ?? selectedInstance?.effectiveVersion ?? '--'}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[min(72vh,760px)]">
          <div className="space-y-2 px-4 py-4">
            {versions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {t('noVersions')}
              </div>
            ) : (
              [...versions].reverse().map((version) => {
                const metadata = versionMetadataByNumber[version]
                const isDisabled = Boolean(metadata?.isDisabled)
                return (
                  <div
                    className={`rounded-xl border px-4 py-3 ${
                      selectedVersion === version
                        ? 'border-primary/50 bg-primary/8'
                        : 'border-border/70 bg-background/30'
                    }`}
                    key={version}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => void onSelectVersion(version)}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">v{version}</span>
                          {detail?.effectiveVersion === version && !isDisabled ? (
                            <Badge variant="outline">{t('effective')}</Badge>
                          ) : null}
                          {isDisabled ? <Badge variant="destructive">{t('disabled')}</Badge> : null}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div>{metadata?.reason ?? t('noReason')}</div>
                          <div>{formatDateTime(metadata?.createdAt, locale, t('invalidDate'))}</div>
                        </div>
                      </button>
                      <Button
                        onClick={() => void onToggleVersionDisabled(version, !isDisabled)}
                        size="xs"
                        variant="outline"
                      >
                        {isDisabled ? t('restore') : t('deactivate')}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
