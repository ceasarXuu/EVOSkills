import { LinkCircle02Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { resolveMarketEntries, type MarketEntry, type MarketEntryGroup } from '@/lib/market-directory'

const MARKET_GROUPS: Array<{ group: MarketEntryGroup; titleKey: 'marketDirectories' | 'marketRepositories' }> = [
  { group: 'directory', titleKey: 'marketDirectories' },
  { group: 'repository', titleKey: 'marketRepositories' },
]

export function MarketWorkspace() {
  const { t } = useI18n()
  const entries = resolveMarketEntries()

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={1.8} />
            <span>{t('market')}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">{t('marketTitle')}</h1>
        </div>
        <div className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('marketIntro')}</div>
      </div>

      {MARKET_GROUPS.map(({ group, titleKey }) => {
        const groupEntries = entries.filter((entry) => entry.group === group)
        return (
          <section className="space-y-4" key={group}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">{t(titleKey)}</h2>
              <Badge variant="outline">
                {groupEntries.length} {t('totalRows')}
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {groupEntries.map((entry) => (
                <MarketEntryCard entry={entry} key={entry.id} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function MarketEntryCard({ entry }: { entry: MarketEntry }) {
  const { t } = useI18n()

  return (
    <Card className="border-border/70 bg-card/92" size="sm">
      <div className="relative h-28 overflow-hidden border-b border-border/70 bg-muted/20">
        {entry.coverUrl ? (
          <img alt="" className="h-full w-full object-cover" src={entry.coverUrl} />
        ) : (
          <div className="flex h-full items-center justify-between bg-[linear-gradient(135deg,color-mix(in_oklab,var(--foreground)_10%,transparent),color-mix(in_oklab,var(--background)_86%,transparent))] px-5">
            <div className="flex size-14 items-center justify-center rounded-lg border border-border/80 bg-background/75 shadow-sm">
              <img alt="" className="size-8" src={entry.resolvedIconUrl} />
            </div>
            <div className="text-5xl font-semibold text-foreground/10">{entry.initials}</div>
          </div>
        )}
      </div>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{entry.displayName}</CardTitle>
            <div className="mt-1 truncate text-xs text-muted-foreground">{entry.displayUrl}</div>
          </div>
          <Badge variant={entry.trust === 'official' ? 'default' : 'outline'}>{trustLabel(entry.trust, t)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="min-h-12 text-sm leading-6 text-muted-foreground">{entry.description}</p>
        <div className="flex flex-wrap gap-2">
          {entry.hosts?.map((host) => (
            <Badge key={host} variant="secondary">
              {host}
            </Badge>
          ))}
          {entry.tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <Button asChild className="mt-auto w-fit" size="sm" variant="outline">
          <a href={entry.url} rel="noreferrer" target="_blank">
            <HugeiconsIcon icon={LinkCircle02Icon} size={15} strokeWidth={1.8} />
            {t('openExternal')}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

function trustLabel(trust: MarketEntry['trust'], t: ReturnType<typeof useI18n>['t']) {
  if (trust === 'official') return t('marketTrustOfficial')
  if (trust === 'reference') return t('marketTrustReference')
  return t('marketTrustCommunity')
}
