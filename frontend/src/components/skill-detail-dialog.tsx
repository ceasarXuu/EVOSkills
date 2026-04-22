import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatRelativeTime } from '@/lib/formatters'
import type { DashboardSkill } from '@/types/dashboard'

interface SkillDetailDialogProps {
  open: boolean
  skill: DashboardSkill | null
  onOpenChange: (open: boolean) => void
}

function getStatusVariant(status: string | undefined) {
  switch (status) {
    case 'optimized':
    case 'active':
      return 'default' as const
    case 'pending':
      return 'outline' as const
    default:
      return 'secondary' as const
  }
}

export function SkillDetailDialog({
  open,
  skill,
  onOpenChange,
}: SkillDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{skill?.skillId ?? '技能详情'}</DialogTitle>
          <DialogDescription>
            当前先打通只读详情壳层，后续再接版本历史、diff 和回滚动作。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="gap-5">
          <TabsList variant="line">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="signals">信号</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>运行实例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <Row label="Runtime" value={skill?.runtime ?? 'unknown'} />
                <Row
                  label="Status"
                  value={
                    skill ? (
                      <Badge variant={getStatusVariant(skill.status)}>
                        {skill.status ?? 'unknown'}
                      </Badge>
                    ) : (
                      'unknown'
                    )
                  }
                />
                <Row label="Revision" value={`v${skill?.current_revision ?? '—'}`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>调用热度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <Row label="Trace Count" value={String(skill?.traceCount ?? 0)} />
                <Row label="Updated" value={formatRelativeTime(skill?.updatedAt)} />
                <Row label="Last Used" value={formatRelativeTime(skill?.lastUsedAt)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signals" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>迁移说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>本次先把技能行点击、详情弹层和只读状态卡打通，确保 v2 已经有稳定的详情入口。</p>
                <p>下一轮会把版本历史、diff 摘要和实例级动作迁到这个壳层里，不再依赖旧字符串弹窗。</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}

interface RowProps {
  label: string
  value: ReactNode
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <span className="text-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
