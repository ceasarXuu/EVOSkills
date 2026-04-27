import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import type {
  DashboardSkillDetail,
  DashboardSkillInstance,
  DashboardSkillVersionMetadata,
} from '@/types/dashboard'

interface SkillVersionHistoryProps {
  detail: DashboardSkillDetail | null
  diffVersion: number | null
  onSelectDiffVersion: (version: number | null) => void
  onSelectVersion: (version: number) => void
  onToggleVersionDisabled: (version: number, disabled: boolean) => void
  selectedInstance: DashboardSkillInstance | null
  selectedVersion: number | null
  versionMetadataByNumber: Record<number, DashboardSkillVersionMetadata>
}

const NO_DIFF_VALUE = '__no_diff__'

export function SkillVersionHistory({
  detail,
  diffVersion,
  onSelectDiffVersion,
  onSelectVersion,
  onToggleVersionDisabled,
  selectedInstance,
  selectedVersion,
  versionMetadataByNumber,
}: SkillVersionHistoryProps) {
  const { t } = useI18n()
  const versions = detail?.versions ?? []
  const currentVersion =
    selectedVersion ?? detail?.effectiveVersion ?? selectedInstance?.effectiveVersion ?? versions[versions.length - 1] ?? null
  const currentMetadata = currentVersion ? versionMetadataByNumber[currentVersion] : null
  const isCurrentDisabled = Boolean(currentMetadata?.isDisabled)

  return (
    <div className="flex min-w-0 items-center gap-1">
      {versions.length === 0 ? (
        <div className="px-3 text-sm text-muted-foreground">{t('noVersions')}</div>
      ) : (
        <>
          <VersionSelect
            ariaLabel={t('selectVersionToView')}
            label={t('viewVersion')}
            onChange={(version) => {
              if (version !== null) onSelectVersion(version)
            }}
            value={currentVersion}
            versions={versions}
          />
          <VersionSelect
            ariaLabel={t('selectVersionToDiff')}
            excludeVersion={currentVersion}
            label={t('diffAgainst')}
            onChange={(version) => onSelectDiffVersion(version)}
            optionalLabel={t('noDiff')}
            value={diffVersion}
            versions={versions}
          />
          <div className="mx-1 h-5 w-px bg-border/80" />
          <div className="flex h-8 items-center gap-1">
            <Badge className="h-8 rounded-lg border-border/70 px-3" variant="outline">
              {t('effective')} v{detail?.effectiveVersion ?? selectedInstance?.effectiveVersion ?? '--'}
            </Badge>
            {isCurrentDisabled ? <Badge variant="destructive">{t('disabled')}</Badge> : null}
            {currentVersion ? (
              <Button
                className="h-8 rounded-lg px-3"
                onClick={() => void onToggleVersionDisabled(currentVersion, !isCurrentDisabled)}
                size="xs"
                variant="outline"
              >
                {isCurrentDisabled ? t('restore') : t('deactivate')}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

function VersionSelect({
  ariaLabel,
  excludeVersion,
  label,
  onChange,
  optionalLabel,
  value,
  versions,
}: {
  ariaLabel: string
  excludeVersion?: number | null
  label: string
  onChange: (version: number | null) => void
  optionalLabel?: string
  value: number | null
  versions: number[]
}) {
  const selectableVersions = [...versions].reverse().filter((version) => version !== excludeVersion)
  const selectValue = value === null ? NO_DIFF_VALUE : String(value)

  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <Select
        onValueChange={(nextValue) => onChange(nextValue === NO_DIFF_VALUE ? null : Number(nextValue))}
        value={selectValue}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          className="h-8 w-[136px] rounded-lg border-transparent bg-transparent px-2 shadow-none hover:bg-muted/60"
        >
          <span className="text-xs text-muted-foreground">{label}</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {optionalLabel ? <SelectItem value={NO_DIFF_VALUE}>{optionalLabel}</SelectItem> : null}
          {selectableVersions.map((version) => (
            <SelectItem key={version} value={String(version)}>
              v{version}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
