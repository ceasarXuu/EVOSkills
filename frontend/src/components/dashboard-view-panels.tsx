import { ActivityFeed } from '@/components/activity-feed'
import { ModelUsagePanel } from '@/components/model-usage-panel'
import { SkillInventory } from '@/components/skill-inventory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import type { DashboardSkill, ProjectSnapshot } from '@/types/dashboard'

interface DashboardViewPanelsProps {
  isLoadingSnapshot: boolean
  selectedSkillKey: string
  snapshot: ProjectSnapshot | null
  onSelectSkill: (skill: DashboardSkill) => void
}

export function DashboardViewPanels({
  isLoadingSnapshot,
  selectedSkillKey,
  snapshot,
  onSelectSkill,
}: DashboardViewPanelsProps) {
  return (
    <>
      <TabsContent value="projects" className="mt-0">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <SkillInventory
            isLoading={isLoadingSnapshot}
            limit={6}
            onSelectSkill={onSelectSkill}
            selectedSkillKey={selectedSkillKey}
            snapshot={snapshot}
          />
          <div className="grid gap-6">
            <ModelUsagePanel isLoading={isLoadingSnapshot} snapshot={snapshot} />
            <DashboardCutoverCard />
          </div>
        </section>
      </TabsContent>

      <TabsContent value="skills" className="mt-0">
        <SkillInventory
          isLoading={isLoadingSnapshot}
          onSelectSkill={onSelectSkill}
          selectedSkillKey={selectedSkillKey}
          snapshot={snapshot}
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-0">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <ActivityFeed isLoading={isLoadingSnapshot} snapshot={snapshot} />
          <ModelUsagePanel isLoading={isLoadingSnapshot} snapshot={snapshot} />
        </section>
      </TabsContent>
    </>
  )
}

function DashboardCutoverCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>切流门槛</CardTitle>
        <CardDescription>继续保持 `/` 与 `/v2` 双入口并行，先把 v2 主工作台做稳。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>当前入口只消费现有 REST + SSE，不复用旧字符串 DOM 和全局类名。</p>
        <p>这轮已经补上 `Tabs / Table / Dialog`，下一步直接迁技能详情和版本历史。</p>
      </CardContent>
    </Card>
  )
}
