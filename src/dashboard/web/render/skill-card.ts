type DashboardSkillCardRenderSkill = {
  skillId?: string;
  status?: string;
  runtime?: string;
  traceCount?: number;
  effectiveVersion?: number;
  versionsAvailable?: Array<unknown>;
  analysisResult?: {
    confidence?: number;
  } | null;
  updatedAt?: string | null;
};

type DashboardSkillCardRenderDeps = {
  escHtml: (value: unknown) => string;
  escJsStr: (value: unknown) => string;
  highlightText: (text: string, query: string) => string;
  maxVersion: (skill: DashboardSkillCardRenderSkill) => number;
  t: (key: string) => string;
  timeAgo: (value: string) => string;
};

type RenderDashboardSkillCardInput = {
  deps: DashboardSkillCardRenderDeps;
  projectPath: string;
  searchQuery: string;
  skill: DashboardSkillCardRenderSkill;
};

type DashboardSkillsEmptyStateDeps = {
  escHtml: (value: unknown) => string;
  t: (key: string) => string;
};

type RenderDashboardSkillsEmptyStateInput = {
  deps: DashboardSkillsEmptyStateDeps;
  searchQuery: string;
};

export function renderDashboardSkillsEmptyState(
  input: RenderDashboardSkillsEmptyStateInput
): string {
  const { deps, searchQuery } = input;
  if (!searchQuery) {
    return '<div class="empty-state">' + deps.t('skillsEmpty') + '</div>';
  }

  return (
    '<div class="empty-state">' +
    deps.t('skillsSearchEmptyPrefix') +
    ' "' +
    deps.escHtml(searchQuery) +
    '"</div>'
  );
}

export function renderDashboardSkillCard(input: RenderDashboardSkillCardInput): string {
  const { deps, projectPath, searchQuery, skill } = input;
  const statusCls = 'status-' + (skill.status || 'pending');
  const versions = skill.versionsAvailable?.length ?? 0;
  const runtime = skill.runtime || 'codex';
  const effectiveVersion = skill.effectiveVersion ?? deps.maxVersion(skill);
  const highlightedName = deps.highlightText(skill.skillId || '', searchQuery);

  return `<div class="skill-card" onclick="viewSkill('${deps.escJsStr(projectPath)}','${deps.escJsStr(skill.skillId || '')}','${deps.escJsStr(runtime)}')">
    <div class="skill-top">
      <div class="skill-name">
        <span class="status-badge ${statusCls}">${deps.escHtml(skill.status ?? 'pending')}</span>
        <span>${highlightedName}</span>
      </div>
      <div class="skill-actions">
        ${versions > 0 ? `<button class="btn-sm" onclick="viewSkill('${deps.escJsStr(projectPath)}','${deps.escJsStr(skill.skillId || '')}','${deps.escJsStr(runtime)}');event.stopPropagation()">${deps.t('skillHistory')} (${versions})</button>` : ''}
      </div>
    </div>
    <div class="skill-meta">
      <span>v${deps.escHtml(effectiveVersion)}</span>
      <span>${deps.escHtml(runtime)}</span>
      <span>${deps.escHtml(skill.traceCount ?? 0)} ${deps.t('skillTraces')}</span>
      ${skill.analysisResult?.confidence !== undefined ? `<span>${deps.t('skillConfidence')}: ${(skill.analysisResult.confidence * 100).toFixed(0)}%</span>` : ''}
      ${skill.updatedAt ? `<span>${deps.timeAgo(skill.updatedAt)}</span>` : ''}
    </div>
  </div>`;
}

export function renderDashboardSkillCardSource(): string {
  return [
    renderDashboardSkillsEmptyState.toString(),
    renderDashboardSkillCard.toString(),
  ].join('\n\n');
}
