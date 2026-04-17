type DashboardCostBucket = {
  callCount?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  avgDurationMs?: number;
  lastCallAt?: string | null;
};

type DashboardCostModelDetail = {
  mode?: string;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  inputCostPerToken?: number;
  outputCostPerToken?: number;
  outputCostPerReasoningToken?: number;
  supportsReasoning?: boolean;
  supportsFunctionCalling?: boolean;
  supportsPromptCaching?: boolean;
  supportsStructuredOutput?: boolean;
  supportsVision?: boolean;
  supportsWebSearch?: boolean;
};

type DashboardCostRow = {
  key: string;
  bucket: DashboardCostBucket;
  detail: DashboardCostModelDetail | null;
  estimatedSpend: number | null;
};

type DashboardAgentUsage = {
  callCount?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMsTotal?: number;
  avgDurationMs?: number;
  lastCallAt?: string | null;
  byModel?: Record<string, DashboardCostBucket>;
  byScope?: Record<string, DashboardCostBucket>;
  bySkill?: Record<string, DashboardCostBucket>;
};

type DashboardProjectData = {
  agentUsage?: DashboardAgentUsage | null;
};

type DashboardCostPanelDeps = {
  buildCostRows: (
    recordMap: Record<string, DashboardCostBucket> | undefined,
    modelDetailsIndex: Record<string, DashboardCostModelDetail | null>,
    options?: { type?: 'model' }
  ) => DashboardCostRow[];
  escHtml: (value: unknown) => string;
  formatContextWindow: (detail: DashboardCostModelDetail | null) => string;
  formatDurationMs: (value: unknown) => string;
  formatPlainNumber: (value: unknown) => string;
  formatUsd: (value: unknown) => string;
  formatUsdPerMillion: (value: unknown) => string;
  formatUsageCompact: (value: unknown) => string;
  getLiteLLMModelDetailsIndex: () => Record<string, DashboardCostModelDetail | null>;
  renderCapabilityPills: (detail: DashboardCostModelDetail | null) => string;
  renderCostBreakdown: (
    title: string,
    rows: DashboardCostRow[],
    emptyText: string,
    formatter: (row: DashboardCostRow) => string,
    countLabel: string
  ) => string;
  t: (key: string) => string;
  timeAgo: (value: string) => string;
};

type RenderDashboardCostPanelInput = {
  deps: DashboardCostPanelDeps;
  projectData: DashboardProjectData | null | undefined;
};

function createEmptyUsage(): DashboardAgentUsage {
  return {
    callCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    durationMsTotal: 0,
    avgDurationMs: 0,
    lastCallAt: null,
    byModel: {},
    byScope: {},
    bySkill: {},
  };
}

export function renderDashboardCostPanel(input: RenderDashboardCostPanelInput): string {
  const { deps } = input;
  const usage = input.projectData?.agentUsage || createEmptyUsage();
  if (!usage.callCount) {
    return '<div class="empty-state">' + deps.t('costEmpty') + '</div>';
  }

  const modelIndex = deps.getLiteLLMModelDetailsIndex();
  const modelRows = deps.buildCostRows(usage.byModel, modelIndex, { type: 'model' });
  const scopeRows = deps.buildCostRows(usage.byScope, modelIndex);
  const skillRows = deps.buildCostRows(usage.bySkill, modelIndex);
  const pricedModelCount = modelRows.filter((row) => typeof row.estimatedSpend === 'number').length;
  const totalEstimatedSpend = modelRows.reduce(
    (sum, row) => sum + (typeof row.estimatedSpend === 'number' ? row.estimatedSpend : 0),
    0
  );
  const avgTokensPerCall =
    usage.callCount > 0 ? Math.round((usage.totalTokens || 0) / usage.callCount) : 0;
  const hasModelMetadata = modelRows.some((row) => !!row.detail);
  const hasReasoningSurcharge = modelRows.some(
    (row) => row.detail && Number(row.detail.outputCostPerReasoningToken) > 0
  );
  const leadModel = modelRows[0] || null;

  function renderSummaryCard(label: string, value: string, sub: string): string {
    return '<div class="cost-summary-card">' +
      '<div class="cost-summary-label">' + deps.escHtml(label) + '</div>' +
      '<div class="cost-summary-value">' + deps.escHtml(value) + '</div>' +
      '<div class="cost-summary-sub">' + deps.escHtml(sub) + '</div>' +
    '</div>';
  }

  function renderModelStat(label: string, value: string, sub: string): string {
    return '<div class="cost-model-stat">' +
      '<div class="cost-model-stat-label">' + deps.escHtml(label) + '</div>' +
      '<div class="cost-model-stat-value">' + deps.escHtml(value) + '</div>' +
      '<div class="cost-model-stat-sub">' + deps.escHtml(sub) + '</div>' +
    '</div>';
  }

  const modelHtml = modelRows.map((row) =>
    '<tr>' +
      '<td>' +
        '<div class="cost-primary">' + deps.escHtml(row.key) + '</div>' +
        '<div class="cost-secondary">' + deps.escHtml((row.detail && row.detail.mode) || 'chat') + ' · ' +
          deps.formatPlainNumber(row.bucket.callCount || 0) + ' ' + deps.t('costTableCallsSuffix') + '</div>' +
      '</td>' +
      '<td>' +
        '<div class="cost-primary">' + (typeof row.estimatedSpend === 'number' ? deps.formatUsd(row.estimatedSpend) : '—') + '</div>' +
        '<div class="cost-secondary">' + deps.formatUsageCompact(row.bucket.totalTokens || 0) + ' ' + deps.t('costTableTokensSuffix') + '</div>' +
      '</td>' +
      '<td>' +
        '<div class="cost-primary">' + deps.formatUsageCompact(row.bucket.promptTokens || 0) + ' / ' + deps.formatUsageCompact(row.bucket.completionTokens || 0) + '</div>' +
        '<div class="cost-secondary">' + deps.t('costTableInOut') + '</div>' +
      '</td>' +
      '<td>' +
        '<div class="cost-primary">' + deps.formatDurationMs(row.bucket.avgDurationMs) + '</div>' +
        '<div class="cost-secondary">' + deps.t('costTableLastSeen') + ' ' + (row.bucket.lastCallAt ? deps.timeAgo(row.bucket.lastCallAt) : '—') + '</div>' +
      '</td>' +
      '<td>' +
        '<div class="cost-primary">' + deps.formatContextWindow(row.detail) + '</div>' +
        '<div class="cost-secondary">' + deps.t('costTableInOut') + '</div>' +
      '</td>' +
      '<td>' +
        '<div class="cost-primary">' +
          (row.detail ? deps.formatUsdPerMillion(row.detail.inputCostPerToken) + ' · ' + deps.formatUsdPerMillion(row.detail.outputCostPerToken) : '—') +
        '</div>' +
        '<div class="cost-secondary">' +
          (row.detail
            ? (Number(row.detail.outputCostPerReasoningToken) > 0
              ? deps.t('costPricingReasoningSurcharge')
              : deps.t('costPricingSource'))
            : deps.t('costUnknownPricing')) +
        '</div>' +
      '</td>' +
      '<td>' + deps.renderCapabilityPills(row.detail) + '</td>' +
    '</tr>'
  ).join('');

  return '<div class="cost-shell">' +
    '<div class="cost-hero">' +
      '<div class="cost-hero-main">' +
        '<div class="cost-eyebrow">' + deps.escHtml(deps.t('costEstimated')) + '</div>' +
        '<div class="cost-hero-value">' + deps.escHtml(pricedModelCount > 0 ? deps.formatUsd(totalEstimatedSpend) : '—') + '</div>' +
        '<div class="cost-hero-copy">' + deps.escHtml(pricedModelCount > 0 ? deps.t('costEstimatedSub') : deps.t('costUnknownPricing')) + '</div>' +
      '</div>' +
      '<div class="cost-summary-grid">' +
        renderSummaryCard(deps.t('costInputTokens'), deps.formatUsageCompact(usage.promptTokens), deps.t('costInputTokensSub')) +
        renderSummaryCard(deps.t('costOutputTokens'), deps.formatUsageCompact(usage.completionTokens), deps.t('costOutputTokensSub')) +
        renderSummaryCard(deps.t('costTotalTokens'), deps.formatUsageCompact(usage.totalTokens), deps.t('costTotalTokensSub')) +
        renderSummaryCard(deps.t('costAvgLatency'), deps.formatDurationMs(usage.avgDurationMs), deps.t('costAvgLatencySub')) +
        renderSummaryCard(deps.t('costAvgTokensPerCall'), deps.formatUsageCompact(avgTokensPerCall), deps.t('costAvgTokensPerCallSub')) +
        renderSummaryCard(deps.t('costLastCall'), usage.lastCallAt ? deps.timeAgo(usage.lastCallAt) : '—', deps.t('costLastCallSub')) +
      '</div>' +
    '</div>' +
    '<div class="cost-board">' +
      '<div class="cost-main">' +
        '<div class="card cost-model-card">' +
          '<div class="card-header"><span>' + deps.t('costModelSpend') + '</span><span style="color:var(--muted)">' + deps.formatPlainNumber(modelRows.length) + ' ' + deps.t('costModelCount') + '</span></div>' +
          '<div class="card-body">' +
            '<div class="cost-model-summary">' +
              renderModelStat(
                deps.t('costTableModel'),
                leadModel ? leadModel.key : '—',
                leadModel
                  ? (deps.formatUsageCompact(leadModel.bucket.totalTokens || 0) + ' ' + deps.t('costTableTokensSuffix'))
                  : deps.t('costScopeEmpty')
              ) +
              renderModelStat(
                deps.t('costEstimated'),
                deps.formatPlainNumber(pricedModelCount) + '/' + deps.formatPlainNumber(modelRows.length),
                pricedModelCount > 0 ? deps.t('costPricingSource') : deps.t('costUnknownPricing')
              ) +
              renderModelStat(
                deps.t('costLastCall'),
                usage.lastCallAt ? deps.timeAgo(usage.lastCallAt) : '—',
                usage.callCount > 0
                  ? (deps.formatPlainNumber(usage.callCount) + ' ' + deps.t('costTableCallsSuffix'))
                  : deps.t('costCallsSub')
              ) +
            '</div>' +
            '<div class="cost-table-wrap">' +
              '<table class="cost-table">' +
                '<thead><tr>' +
                  '<th>' + deps.t('costTableModel') + '</th>' +
                  '<th>' + deps.t('costEstimatedSpend') + '</th>' +
                  '<th>' + deps.t('costTableUsage') + '</th>' +
                  '<th>' + deps.t('costTableLatency') + '</th>' +
                  '<th>' + deps.t('costTableContextWindow') + '</th>' +
                  '<th>' + deps.t('costTablePricing') + '</th>' +
                  '<th>' + deps.t('costTableCapabilities') + '</th>' +
                '</tr></thead>' +
                '<tbody>' + modelHtml + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cost-rail">' +
        deps.renderCostBreakdown(deps.t('costScopeBreakdown'), scopeRows, deps.t('costScopeEmpty'), (row) => deps.formatUsageCompact(row.bucket.totalTokens || 0), deps.t('costTableTokensSuffix')) +
        deps.renderCostBreakdown(deps.t('costSkillBreakdown'), skillRows, deps.t('costSkillEmpty'), (row) => deps.formatUsageCompact(row.bucket.totalTokens || 0), deps.t('costTableTokensSuffix')) +
        '<div class="card">' +
          '<div class="card-header"><span>' + deps.t('costSignalsTitle') + '</span></div>' +
          '<div class="card-body">' +
            '<div class="cost-note"><strong>' + deps.t('costSignalsSourceLabel') + '</strong> ' + deps.t('costSignalsSourceBody') + '</div>' +
            '<div class="cost-note" style="margin-top:8px"><strong>' + deps.t('costSignalsVisibleLabel') + '</strong> ' + deps.t('costSignalsVisibleBody') + '</div>' +
            '<div class="cost-chip-row" style="margin-top:10px">' +
              '<span class="cost-chip">' + (hasModelMetadata ? deps.t('costSignalsContextReady') : deps.t('costSignalsContextPending')) + '</span>' +
              '<span class="cost-chip">' + (hasReasoningSurcharge ? deps.t('costSignalsReasoningDetected') : deps.t('costSignalsInputOutputOnly')) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

export function renderDashboardCostPanelSource(): string {
  return [
    createEmptyUsage.toString(),
    '',
    renderDashboardCostPanel.toString(),
  ].join('\n');
}
