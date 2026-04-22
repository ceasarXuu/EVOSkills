import { Fragment, useEffect, useMemo, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { Activity02Icon, TaskDone02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatRelativeTime, getSkillStatusBadgeVariant } from '@/lib/format'
import { getVisiblePaginationPages, paginateItems } from '@/lib/pagination'
import type { DashboardDecisionEvent, DashboardTrace, ProjectSnapshot } from '@/types/dashboard'

interface ActivityStreamProps {
  isLoading: boolean
  snapshot: ProjectSnapshot | null
}

const TRACE_PAGE_SIZE = 6
const DECISION_PAGE_SIZE = 6

export function ActivityStream({ isLoading, snapshot }: ActivityStreamProps) {
  const traceItems = snapshot?.recentTraces ?? []
  const decisionItems = snapshot?.decisionEvents ?? []
  const [tracePage, setTracePage] = useState(1)
  const [decisionPage, setDecisionPage] = useState(1)

  useEffect(() => {
    setTracePage(1)
  }, [traceItems])

  useEffect(() => {
    setDecisionPage(1)
  }, [decisionItems])

  const tracePagination = useMemo(
    () => paginateItems(traceItems, tracePage, TRACE_PAGE_SIZE),
    [traceItems, tracePage],
  )
  const decisionPagination = useMemo(
    () => paginateItems(decisionItems, decisionPage, DECISION_PAGE_SIZE),
    [decisionItems, decisionPage],
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ActivityCard<DashboardTrace>
        emptyLabel="还没有 recent traces。"
        icon={Activity02Icon}
        isLoading={isLoading}
        items={tracePagination.pageItems}
        onPageChange={setTracePage}
        pagination={tracePagination}
        title="Recent Traces"
        renderItem={(item: DashboardTrace) => (
          <TraceItem key={item.trace_id ?? item.timestamp} trace={item} />
        )}
      />
      <ActivityCard<DashboardDecisionEvent>
        emptyLabel="最近没有 decision events。"
        icon={TaskDone02Icon}
        isLoading={isLoading}
        items={decisionPagination.pageItems}
        onPageChange={setDecisionPage}
        pagination={decisionPagination}
        title="Decision Events"
        renderItem={(item: DashboardDecisionEvent) => (
          <DecisionItem event={item} key={item.id ?? item.timestamp} />
        )}
      />
    </div>
  )
}

function ActivityCard<T,>({
  emptyLabel,
  icon,
  isLoading,
  items,
  onPageChange,
  pagination,
  renderItem,
  title,
}: {
  emptyLabel: string
  icon: ComponentProps<typeof HugeiconsIcon>['icon']
  isLoading: boolean
  items: T[]
  onPageChange: (page: number) => void
  pagination: ReturnType<typeof paginateItems<T>>
  renderItem: (item: T) => ReactNode
  title: string
}) {
  const visiblePages = getVisiblePaginationPages(
    pagination.currentPage,
    pagination.totalPages,
  )

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && items.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-[min(62vh,760px)] pr-4">
              <div className="space-y-3">{items.map(renderItem)}</div>
            </ScrollArea>
            <div className="flex flex-col gap-4 border-t border-border/70 pt-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="text-sm text-muted-foreground">
                显示第 {(pagination.currentPage - 1) * pagination.pageSize + 1}-
                {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} 条，共{' '}
                {pagination.totalItems} 条
              </div>
              <Pagination className="mx-0 w-auto justify-start xl:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        if (pagination.hasPreviousPage) {
                          onPageChange(pagination.currentPage - 1)
                        }
                      }}
                      text="上一页"
                    />
                  </PaginationItem>

                  {visiblePages.map((pageNumber, index) => {
                    const previousPage = visiblePages[index - 1]
                    const shouldShowEllipsis = previousPage && pageNumber - previousPage > 1

                    return (
                      <Fragment key={pageNumber}>
                        {shouldShowEllipsis ? (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : null}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            isActive={pagination.currentPage === pageNumber}
                            onClick={(event) => {
                              event.preventDefault()
                              onPageChange(pageNumber)
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      </Fragment>
                    )
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        if (pagination.hasNextPage) {
                          onPageChange(pagination.currentPage + 1)
                        }
                      }}
                      text="下一页"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TraceItem({ trace }: { trace: DashboardTrace }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/35 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">{trace.event_type ?? 'unknown event'}</p>
          <p className="text-sm text-muted-foreground">
            {trace.runtime ?? 'unknown'} · {trace.session_id ?? 'no-session'}
          </p>
        </div>
        <Badge variant={getSkillStatusBadgeVariant(trace.status)}>{trace.status ?? 'unknown'}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{formatDateTime(trace.timestamp)}</span>
        <span>{formatRelativeTime(trace.timestamp)}</span>
        {Array.isArray(trace.skill_refs) && trace.skill_refs.length > 0 ? (
          <span>{trace.skill_refs.slice(0, 2).join(', ')}</span>
        ) : null}
      </div>
    </div>
  )
}

function DecisionItem({ event }: { event: DashboardDecisionEvent }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/35 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">{event.skillId ?? event.tag ?? 'decision event'}</p>
          <p className="text-sm text-muted-foreground">
            {event.ruleName ?? 'no rule'} · {event.businessTag ?? 'no business tag'}
          </p>
        </div>
        <Badge variant={getSkillStatusBadgeVariant(event.status)}>{event.status ?? 'unknown'}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {event.judgment ?? event.nextAction ?? event.reason ?? '暂无详情'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{formatDateTime(event.timestamp)}</span>
        <span>{formatRelativeTime(event.timestamp)}</span>
      </div>
    </div>
  )
}
