type DashboardSkillCardRenderSkill = {
  skillId?: string;
  status?: string;
  runtime?: string;
  runtimeMembers?: Array<{
    runtime?: string;
  }>;
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

function getRuntimeLabel(runtime: string): string {
  switch (runtime) {
    case 'claude':
      return 'Claude';
    case 'opencode':
      return 'OpenCode';
    default:
      return 'Codex';
  }
}

function getRuntimeMembers(skill: DashboardSkillCardRenderSkill): Array<{ runtime: string }> {
  if (Array.isArray(skill.runtimeMembers) && skill.runtimeMembers.length > 0) {
    return skill.runtimeMembers.map((member) => ({
      runtime: member.runtime || 'codex',
    }));
  }

  return [{ runtime: skill.runtime || 'codex' }];
}

export function renderDashboardSkillCard(input: RenderDashboardSkillCardInput): string {
  const { deps, projectPath, searchQuery, skill } = input;
  const statusCls = 'status-' + (skill.status || 'pending');
  const versions = skill.versionsAvailable?.length ?? 0;
  const runtime = skill.runtime || 'codex';
  const effectiveVersion = skill.effectiveVersion ?? deps.maxVersion(skill);
  const highlightedName = deps.highlightText(skill.skillId || '', searchQuery);
  const runtimeMembers = getRuntimeMembers(skill);
  const openArgs = runtimeMembers.length > 1
    ? `'${deps.escJsStr(projectPath)}','${deps.escJsStr(skill.skillId || '')}'`
    : `'${deps.escJsStr(projectPath)}','${deps.escJsStr(skill.skillId || '')}','${deps.escJsStr(runtime)}'`;
  const runtimePills = runtimeMembers.map((member) => {
    const activeCls = member.runtime === runtime ? ' active' : '';
    return `<span class="skill-runtime-pill${activeCls}">${deps.escHtml(member.runtime)}</span>`;
  }).join('');

  return `<div class="skill-card" onclick="viewSkill(${openArgs})">
    <div class="skill-top">
      <div class="skill-name">
        <span class="status-badge ${statusCls}">${deps.escHtml(skill.status ?? 'pending')}</span>
        <span>${highlightedName}</span>
      </div>
      <div class="skill-actions">
        ${versions > 0 ? `<button class="btn-sm" onclick="viewSkill(${openArgs});event.stopPropagation()">${deps.t('skillHistory')} (${versions})</button>` : ''}
      </div>
    </div>
    <div class="skill-meta">
      <span>v${deps.escHtml(effectiveVersion)}</span>
      <span>${deps.escHtml(getRuntimeLabel(runtime))}</span>
      <span>${deps.escHtml(skill.traceCount ?? 0)} ${deps.t('skillTraces')}</span>
      ${skill.analysisResult?.confidence !== undefined ? `<span>${deps.t('skillConfidence')}: ${(skill.analysisResult.confidence * 100).toFixed(0)}%</span>` : ''}
      ${skill.updatedAt ? `<span>${deps.timeAgo(skill.updatedAt)}</span>` : ''}
    </div>
    <div class="skill-runtime-list">${runtimePills}</div>
  </div>`;
}

export function renderDashboardSkillCardSource(): string {
  return [
    renderDashboardSkillsEmptyState.toString(),
    getRuntimeLabel.toString(),
    getRuntimeMembers.toString(),
    renderDashboardSkillCard.toString(),
  ].join('\n\n');
}
