type DashboardCostModelDetailLike = {
  supportsReasoning?: boolean;
  supportsFunctionCalling?: boolean;
  supportsPromptCaching?: boolean;
  supportsStructuredOutput?: boolean;
  supportsVision?: boolean;
  supportsWebSearch?: boolean;
} | null;

type RenderDashboardCapabilityPillsInput = {
  detail: DashboardCostModelDetailLike;
  deps: {
    escHtml: (value: unknown) => string;
    t: (key: string) => string;
  };
};

type DashboardCostBreakdownRow = {
  key: string;
  bucket: {
    callCount?: number;
    totalTokens?: number;
  };
};

type RenderDashboardCostBreakdownInput = {
  countLabel: string;
  deps: {
    escHtml: (value: unknown) => string;
    formatPlainNumber: (value: unknown) => string;
    formatUsageCompact: (value: unknown) => string;
    t: (key: string) => string;
  };
  emptyText: string;
  formatter: (row: DashboardCostBreakdownRow) => string;
  rows: DashboardCostBreakdownRow[];
  title: string;
};

export function renderDashboardCapabilityPills(
  input: RenderDashboardCapabilityPillsInput
): string {
  const { detail, deps } = input;
  if (!detail) {
    return '<span class="mono-compact">' + deps.t('costCapabilityNone') + '</span>';
  }

  const pills: string[] = [];
  if (detail.supportsReasoning) pills.push(deps.t('costCapabilityReasoning'));
  if (detail.supportsFunctionCalling) pills.push(deps.t('costCapabilityFunctionCalling'));
  if (detail.supportsPromptCaching) pills.push(deps.t('costCapabilityPromptCaching'));
  if (detail.supportsStructuredOutput) pills.push(deps.t('costCapabilityStructuredOutput'));
  if (detail.supportsVision) pills.push(deps.t('costCapabilityVision'));
  if (detail.supportsWebSearch) pills.push(deps.t('costCapabilityWebSearch'));

  if (pills.length === 0) {
    return '<span class="mono-compact">' + deps.t('costCapabilityNone') + '</span>';
  }

  return (
    '<div class="capability-pills">' +
    pills
      .map((label) => '<span class="capability-pill">' + deps.escHtml(label) + '</span>')
      .join('') +
    '</div>'
  );
}

export function renderDashboardCostBreakdown(
  input: RenderDashboardCostBreakdownInput
): string {
  const { countLabel, deps, emptyText, formatter, rows, title } = input;
  const visibleRows = (rows || []).slice(0, 5);
  const body = visibleRows.length > 0
    ? visibleRows
      .map(
        (row) =>
          '<div class="scope-item">' +
            '<div class="scope-item-top">' +
              '<div class="scope-item-name">' + deps.escHtml(row.key) + '</div>' +
              '<div class="scope-item-value">' + deps.escHtml(formatter(row)) + '</div>' +
            '</div>' +
            '<div class="scope-item-sub">' +
              deps.formatPlainNumber(row.bucket.callCount || 0) +
              ' ' +
              deps.escHtml(deps.t('costTableCallsSuffix')) +
              ' · ' +
              deps.formatUsageCompact(row.bucket.totalTokens || 0) +
              ' ' +
              deps.escHtml(countLabel || deps.t('costTableTokensSuffix')) +
            '</div>' +
          '</div>'
      )
      .join('')
    : '<div class="empty-state">' + deps.escHtml(emptyText) + '</div>';

  return (
    '<div class="card">' +
      '<div class="card-header"><span>' + deps.escHtml(title) + '</span></div>' +
      '<div class="card-body">' + body + '</div>' +
    '</div>'
  );
}

export function renderDashboardCostBreakdownSource(): string {
  return [
    renderDashboardCapabilityPills.toString(),
    renderDashboardCostBreakdown.toString(),
  ].join('\n\n');
}
