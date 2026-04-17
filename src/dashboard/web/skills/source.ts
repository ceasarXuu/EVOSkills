const DASHBOARD_SKILLS_SOURCE = `
function renderStateBadge(state) {
  return renderDashboardStateBadge({
    state,
    deps: {
      t,
    },
  });
}

function normalizeSkillRuntime(runtime) {
  return runtime === 'claude' || runtime === 'opencode' ? runtime : 'codex';
}

function getRuntimeLabel(runtime) {
  const normalized = normalizeSkillRuntime(runtime);
  if (normalized === 'claude') return 'Claude';
  if (normalized === 'opencode') return 'OpenCode';
  return 'Codex';
}

function runtimeSortValue(runtime) {
  const normalized = normalizeSkillRuntime(runtime);
  if (normalized === 'codex') return 0;
  if (normalized === 'claude') return 1;
  if (normalized === 'opencode') return 2;
  return 9;
}

function getSkillUpdatedTimestamp(skill) {
  return skill && skill.updatedAt ? new Date(skill.updatedAt).getTime() : 0;
}

function sortSkillRuntimeMembers(members) {
  return (Array.isArray(members) ? members : []).slice().sort(function(a, b) {
    const runtimeComparison = runtimeSortValue(a && a.runtime) - runtimeSortValue(b && b.runtime);
    if (runtimeComparison !== 0) return runtimeComparison;
    const updatedComparison = getSkillUpdatedTimestamp(b) - getSkillUpdatedTimestamp(a);
    if (updatedComparison !== 0) return updatedComparison;
    return String((a && a.skillId) || '').localeCompare(String((b && b.skillId) || ''));
  });
}

function getProjectSkills(projectPath) {
  const pd = state.projectData[projectPath];
  return Array.isArray(pd && pd.skills) ? pd.skills : [];
}

function findSkillRuntimes(projectPath, skillId) {
  return sortSkillRuntimeMembers(
    getProjectSkills(projectPath).filter(function(skill) {
      return (skill && skill.skillId) === skillId;
    }).map(function(skill) {
      return Object.assign({}, skill, {
        runtime: normalizeSkillRuntime(skill && skill.runtime),
      });
    })
  );
}

function resolveRuntimeFromMembers(members, preferredRuntime) {
  const normalizedPreferred = preferredRuntime ? normalizeSkillRuntime(preferredRuntime) : '';
  const normalizedSelectedTab = state.selectedRuntimeTab && state.selectedRuntimeTab !== 'all'
    ? normalizeSkillRuntime(state.selectedRuntimeTab)
    : '';
  const normalizedStatePreferred = normalizeSkillRuntime(state.preferredSkillRuntime);
  const normalizedMembers = sortSkillRuntimeMembers((Array.isArray(members) ? members : []).map(function(member) {
    return Object.assign({}, member, {
      runtime: normalizeSkillRuntime(member && member.runtime),
    });
  }));

  if (normalizedMembers.length === 0) {
    return 'codex';
  }

  const availableRuntimes = normalizedMembers.map(function(member) {
    return normalizeSkillRuntime(member.runtime);
  });

  if (normalizedPreferred && availableRuntimes.indexOf(normalizedPreferred) >= 0) {
    return normalizedPreferred;
  }

  if (normalizedSelectedTab && availableRuntimes.indexOf(normalizedSelectedTab) >= 0) {
    return normalizedSelectedTab;
  }

  if (normalizedStatePreferred && availableRuntimes.indexOf(normalizedStatePreferred) >= 0) {
    return normalizedStatePreferred;
  }

  if (availableRuntimes.indexOf('codex') >= 0) {
    return 'codex';
  }

  return availableRuntimes[0];
}

function persistPreferredSkillRuntime(runtime) {
  const normalized = normalizeSkillRuntime(runtime);
  state.preferredSkillRuntime = normalized;
  try {
    localStorage.setItem(SKILL_MODAL_RUNTIME_STORAGE_KEY, normalized);
  } catch (error) {
    console.warn('[dashboard] failed to persist preferred skill host', {
      runtime: normalized,
      error: String(error),
    });
  }
  console.info('[dashboard] preferred skill host updated', { runtime: normalized });
}

function buildGroupedSkill(skillId, members) {
  const runtimeMembers = sortSkillRuntimeMembers(members).map(function(member) {
    return Object.assign({}, member, {
      runtime: normalizeSkillRuntime(member && member.runtime),
    });
  });
  const selectedRuntime = resolveRuntimeFromMembers(runtimeMembers);
  const selectedMember = runtimeMembers.find(function(member) {
    return normalizeSkillRuntime(member.runtime) === selectedRuntime;
  }) || runtimeMembers[0] || {};
  const latestMember = runtimeMembers.slice().sort(function(a, b) {
    return getSkillUpdatedTimestamp(b) - getSkillUpdatedTimestamp(a);
  })[0] || selectedMember;
  const totalTraceCount = runtimeMembers.reduce(function(sum, member) {
    return sum + Number((member && member.traceCount) || 0);
  }, 0);

  return Object.assign({}, selectedMember, {
    skillId: skillId,
    runtime: selectedRuntime,
    runtimeMembers: runtimeMembers.map(function(member) {
      return { runtime: normalizeSkillRuntime(member.runtime) };
    }),
    traceCount: totalTraceCount,
    updatedAt: latestMember && latestMember.updatedAt ? latestMember.updatedAt : selectedMember.updatedAt,
    members: runtimeMembers,
  });
}

function buildGroupedSkills(skills) {
  const groups = new Map();
  (Array.isArray(skills) ? skills : []).forEach(function(skill) {
    const skillId = skill && skill.skillId ? skill.skillId : '';
    if (!skillId) return;
    if (!groups.has(skillId)) {
      groups.set(skillId, []);
    }
    groups.get(skillId).push(skill);
  });

  return Array.from(groups.entries()).map(function(entry) {
    return buildGroupedSkill(entry[0], entry[1]);
  });
}

function selectRuntimeTab(runtime) {
  state.selectedRuntimeTab = runtime;
  updateSkillsList();
}

function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();
  updateSkillsList();
}

function toggleSort(sortBy) {
  if (state.sortBy === sortBy) {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortBy = sortBy;
    state.sortOrder = 'asc';
  }
  updateSkillsList();
}

function renderSkillsEmptyState() {
  return renderDashboardSkillsEmptyState({
    searchQuery: state.searchQuery,
    deps: {
      escHtml,
      t,
    },
  });
}

function matchesSkillSearch(skill) {
  if (!state.searchQuery) return true;
  const query = state.searchQuery;
  const skillId = String((skill && skill.skillId) || '').toLowerCase();
  const status = String((skill && skill.status) || '').toLowerCase();
  const runtimes = (Array.isArray(skill && skill.runtimeMembers) ? skill.runtimeMembers : []).map(function(member) {
    return String(normalizeSkillRuntime(member && member.runtime)).toLowerCase();
  }).join(' ');
  return skillId.indexOf(query) >= 0 || status.indexOf(query) >= 0 || runtimes.indexOf(query) >= 0;
}

function getFilteredSkills(skills) {
  let grouped = buildGroupedSkills(skills);

  if (state.selectedRuntimeTab !== 'all') {
    grouped = grouped.filter(function(skill) {
      return (Array.isArray(skill && skill.runtimeMembers) ? skill.runtimeMembers : []).some(function(member) {
        return normalizeSkillRuntime(member && member.runtime) === state.selectedRuntimeTab;
      });
    });
  }

  return grouped.filter(matchesSkillSearch);
}

function getFilteredAndSortedSkills(skills) {
  const filtered = getFilteredSkills(skills);

  filtered.forEach(function(skill) {
    skill.runtime = resolveRuntimeFromMembers(skill.members || skill.runtimeMembers);
  });

  filtered.sort(function(a, b) {
    let comparison = 0;
    if (state.sortBy === 'name') {
      comparison = String((a && a.skillId) || '').localeCompare(String((b && b.skillId) || ''));
    } else if (state.sortBy === 'updated') {
      comparison = getSkillUpdatedTimestamp(a) - getSkillUpdatedTimestamp(b);
    }
    return state.sortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
}

function updateSkillsList() {
  const container = document.getElementById('skillsListContainer');
  const countEl = document.getElementById('skillsCount');
  if (!container || !state.selectedProjectId) return;

  const pd = state.projectData[state.selectedProjectId];
  if (!pd) return;

  const filtered = getFilteredAndSortedSkills(pd.skills || []);

  if (countEl) {
    countEl.textContent = filtered.length + ' ' + t('skillsCount');
  }

  container.innerHTML = filtered.length === 0
    ? renderSkillsEmptyState()
    : '<div class="skills-list">' + filtered.map(function(skill) {
      return renderSkillCard(skill, state.selectedProjectId);
    }).join('') + '</div>';
}

function highlightText(text, query) {
  if (!query || !text) return escHtml(text || '');
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return escHtml(text);
  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);
  return escHtml(before) + '<span class="highlight">' + escHtml(match) + '</span>' + escHtml(after);
}

function renderSkillCard(skill, projectPath) {
  const preferredRuntime = resolveRuntimeFromMembers(skill && skill.members ? skill.members : skill && skill.runtimeMembers, skill && skill.runtime);
  const cardSkill = Object.assign({}, skill, {
    runtime: preferredRuntime,
  });

  return renderDashboardSkillCard({
    skill: cardSkill,
    projectPath: projectPath,
    searchQuery: state.searchQuery,
    deps: {
      escHtml,
      escJsStr,
      highlightText,
      maxVersion,
      t,
      timeAgo,
    },
  });
}

function renderTraceBars(label, data, keys) {
  return renderDashboardTraceBars({ label: label, data: data, keys: keys });
}

function renderRecentTraces(traces) {
  const projectPath = state.selectedProjectId;
  const rows = projectPath ? buildRawTraceRows(projectPath) : [];
  return projectPath
    ? renderDashboardRecentTraces({
      projectPath: projectPath,
      rows: rows,
      deps: {
        escHtml,
        escJsStr,
        formatEventTimestamp,
        getActivityColumnStyle,
        summarizeTraceEventType,
        t,
      },
    })
    : '';
}

function updateModalRuntimeSelect(runtimes, currentRuntime) {
  const select = document.getElementById('modalRuntimeSelect');
  if (!select) return;

  const normalizedRuntimes = sortSkillRuntimeMembers((Array.isArray(runtimes) ? runtimes : []).map(function(runtime) {
    return typeof runtime === 'string'
      ? { runtime: normalizeSkillRuntime(runtime) }
      : { runtime: normalizeSkillRuntime(runtime && runtime.runtime) };
  }));
  const runtimeOptions = normalizedRuntimes.length > 0 ? normalizedRuntimes : [{ runtime: 'codex' }];

  select.innerHTML = runtimeOptions.map(function(runtimeOption) {
    const runtime = normalizeSkillRuntime(runtimeOption.runtime);
    return '<option value="' + escHtml(runtime) + '">' + escHtml(getRuntimeLabel(runtime)) + '</option>';
  }).join('');
  select.value = normalizeSkillRuntime(currentRuntime || runtimeOptions[0].runtime);
  select.disabled = runtimeOptions.length <= 1;
}

function updateModalSkillHeader(projectPath, skillId, runtime) {
  const titleEl = document.getElementById('modalSkillName');
  const statusEl = document.getElementById('modalSkillStatus');
  if (titleEl) {
    titleEl.textContent = skillId;
  }

  if (!statusEl) return;
  const skill = getProjectSkills(projectPath).find(function(item) {
    return item && item.skillId === skillId && normalizeSkillRuntime(item.runtime) === normalizeSkillRuntime(runtime);
  });

  if (skill) {
    statusEl.innerHTML = '<span class="status-badge status-' + escHtml(skill.status) + '">' + escHtml(skill.status) + '</span>';
  } else {
    statusEl.innerHTML = '';
  }
}

async function viewSkill(projectPath, skillId, runtime) {
  const runtimeMembers = findSkillRuntimes(projectPath, skillId);
  const resolvedRuntime = resolveRuntimeFromMembers(runtimeMembers, runtime);
  state.currentSkillId = skillId;
  state.currentSkillRuntime = resolvedRuntime;
  state.currentSkillAvailableRuntimes = runtimeMembers.map(function(member) {
    return normalizeSkillRuntime(member.runtime);
  });

  const modal = document.getElementById('skillModal');
  if (modal) {
    modal.classList.add('visible');
  }

  updateModalRuntimeSelect(state.currentSkillAvailableRuntimes, resolvedRuntime);
  updateModalSkillHeader(projectPath, skillId, resolvedRuntime);

  const saveHintEl = document.getElementById('modalSaveHint');
  if (saveHintEl) {
    saveHintEl.textContent = '';
  }
  const saveBtn = document.getElementById('modalSaveBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = t('modalSave');
  }
  const applyAllBtn = document.getElementById('modalApplyAllBtn');
  if (applyAllBtn) {
    applyAllBtn.disabled = false;
    applyAllBtn.textContent = t('modalApplyAllButton');
  }

  const contentEl = document.getElementById('modalContent');
  if (contentEl) {
    contentEl.value = t('modalLoading');
  }

  try {
    const enc = encodeURIComponent(projectPath);
    const encSkill = encodeURIComponent(skillId);
    const encRuntime = encodeURIComponent(resolvedRuntime);
    const r = await fetch('/api/projects/' + enc + '/skills/' + encSkill + '?runtime=' + encRuntime);
    if (!r.ok) {
      throw new Error('HTTP ' + r.status + ': ' + r.statusText);
    }
    const data = await r.json();
    if (contentEl) {
      contentEl.value = data.content ?? t('modalNoContent');
    }

    const versions = data.versions ?? [];
    state.currentSkillVersions = Array.isArray(versions) ? versions.slice() : [];
    state.currentSkillEffectiveVersion = typeof data.effectiveVersion === 'number' ? data.effectiveVersion : null;
    state.currentSkillVersion = typeof data.effectiveVersion === 'number'
      ? data.effectiveVersion
      : (versions.length > 0 ? Math.max.apply(Math, versions) : null);
    state.currentSkillVersionMeta = {};
    state.currentSkillVersionContextKey = getSkillVersionContextKey(enc, encSkill, encRuntime);
    renderVersionHistory(enc, encSkill, encRuntime);

    if (versions.length > 0) {
      await Promise.allSettled(versions.map(function(version) {
        return loadVersionMeta(enc, encSkill, encRuntime, version);
      }));
    }
  } catch (e) {
    console.error('[dashboard] failed to load skill content', {
      projectPath: projectPath,
      skillId: skillId,
      runtime: resolvedRuntime,
      error: String(e),
    });
    if (contentEl) {
      contentEl.value = t('modalLoadError');
    }
  }
}

async function switchSkillRuntime(runtime) {
  const normalized = normalizeSkillRuntime(runtime);
  persistPreferredSkillRuntime(normalized);

  const select = document.getElementById('modalRuntimeSelect');
  if (select) {
    select.value = normalized;
  }

  if (!state.selectedProjectId || !state.currentSkillId) {
    return;
  }

  console.info('[dashboard] switching skill modal host', {
    projectPath: state.selectedProjectId,
    skillId: state.currentSkillId,
    runtime: normalized,
  });

  await viewSkill(state.selectedProjectId, state.currentSkillId, normalized);

  if (state.selectedMainTab === 'skills') {
    updateSkillsList();
  }
}

async function loadVersionMeta(encProject, encSkill, encRuntime, version) {
  const contextKey = getSkillVersionContextKey(encProject, encSkill, encRuntime);
  try {
    const r = await fetch('/api/projects/' + encProject + '/skills/' + encSkill + '/versions/' + version + '?runtime=' + encRuntime);
    if (!r.ok) return;
    const data = await r.json();
    if (state.currentSkillVersionContextKey !== contextKey) return;
    if (!state.currentSkillVersionMeta || typeof state.currentSkillVersionMeta !== 'object') {
      state.currentSkillVersionMeta = {};
    }
    state.currentSkillVersionMeta[version] = data.metadata || null;
    renderVersionHistory(encProject, encSkill, encRuntime);
    const el = document.getElementById('vmeta_' + version);
    if (el && data.metadata) {
      el.innerHTML = renderVersionMetaHtml(encProject, data.metadata);
    }
  } catch (e) {
    console.warn('[dashboard] failed to load version metadata', {
      encProject: encProject,
      encSkill: encSkill,
      version: version,
      error: String(e),
    });
  }
}

async function loadVersion(encProject, encSkill, encRuntime, version) {
  const contextKey = getSkillVersionContextKey(encProject, encSkill, encRuntime);
  try {
    const r = await fetch('/api/projects/' + encProject + '/skills/' + encSkill + '/versions/' + version + '?runtime=' + encRuntime);
    if (!r.ok) {
      throw new Error('HTTP ' + r.status + ': ' + r.statusText);
    }
    const data = await r.json();
    if (state.currentSkillVersionContextKey === contextKey) {
      state.currentSkillVersion = version;
      if (!state.currentSkillVersionMeta || typeof state.currentSkillVersionMeta !== 'object') {
        state.currentSkillVersionMeta = {};
      }
      state.currentSkillVersionMeta[version] = data.metadata || state.currentSkillVersionMeta[version] || null;
      renderVersionHistory(encProject, encSkill, encRuntime);
      console.debug('[dashboard] selected skill version', {
        encProject: encProject,
        encSkill: encSkill,
        encRuntime: encRuntime,
        version: version,
      });
    }
    document.getElementById('modalContent').value = data.content ?? t('modalNoContent');
    await loadVersionMeta(encProject, encSkill, encRuntime, version);
  } catch (e) {
    console.error('[dashboard] failed to load version content', {
      encProject: encProject,
      encSkill: encSkill,
      version: version,
      error: String(e),
    });
  }
}

async function toggleSkillVersionDisabled(encProject, encSkill, encRuntime, version, disabled) {
  const contextKey = getSkillVersionContextKey(encProject, encSkill, encRuntime);
  const hintEl = document.getElementById('modalSaveHint');
  try {
    const r = await fetch('/api/projects/' + encProject + '/skills/' + encSkill + '/versions/' + version + '?runtime=' + encRuntime, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !!disabled }),
    });
    if (!r.ok) {
      const errorBody = await r.json().catch(function() { return {}; });
      throw new Error((errorBody && errorBody.error) || ('HTTP ' + r.status + ': ' + r.statusText));
    }
    const data = await r.json();
    if (state.currentSkillVersionContextKey !== contextKey) return;
    if (!state.currentSkillVersionMeta || typeof state.currentSkillVersionMeta !== 'object') {
      state.currentSkillVersionMeta = {};
    }
    state.currentSkillVersionMeta[version] = data.metadata || state.currentSkillVersionMeta[version] || null;
    state.currentSkillEffectiveVersion = typeof data.effectiveVersion === 'number' ? data.effectiveVersion : state.currentSkillEffectiveVersion;
    renderVersionHistory(encProject, encSkill, encRuntime);

    const projectPath = decodeURIComponent(encProject);
    const runtime = decodeURIComponent(encRuntime);
    const skillId = decodeURIComponent(encSkill);
    const pd = state.projectData[projectPath];
    const skills = Array.isArray(pd && pd.skills) ? pd.skills : [];
    const skill = skills.find(function(item) {
      return item && item.skillId === skillId && normalizeSkillRuntime(item.runtime) === normalizeSkillRuntime(runtime);
    });
    if (skill) {
      skill.effectiveVersion = state.currentSkillEffectiveVersion;
    }
    if (state.selectedProjectId === projectPath && state.selectedMainTab === 'skills') {
      updateSkillsList();
    }

    if (hintEl) {
      hintEl.textContent = '';
    }
    console.info('[dashboard] toggled skill version state', {
      encProject: encProject,
      encSkill: encSkill,
      encRuntime: encRuntime,
      version: version,
      disabled: disabled,
      effectiveVersion: state.currentSkillEffectiveVersion,
    });
  } catch (e) {
    console.error('[dashboard] failed to toggle skill version state', {
      encProject: encProject,
      encSkill: encSkill,
      encRuntime: encRuntime,
      version: version,
      disabled: disabled,
      error: String(e),
    });
    if (hintEl) {
      hintEl.textContent = t('modalVersionActionFailed');
    }
  }
}

function renderApplyToAllConfirmation() {
  const titleEl = document.getElementById('applyAllConfirmTitle');
  const bodyEl = document.getElementById('applyAllConfirmBody');
  if (!titleEl || !bodyEl) return;
  const skillId = state.currentSkillId || '—';
  const runtime = state.currentSkillRuntime || 'codex';
  titleEl.textContent = t('modalApplyAllTitle');
  bodyEl.innerHTML =
    '<p><strong>' + escHtml(skillId) + ' (' + escHtml(runtime) + ')</strong></p>' +
    '<p>' + escHtml(t('modalApplyAllSavingLine')) + '</p>' +
    '<p>' + escHtml(t('modalApplyAllTargetsLine')) + '</p>' +
    '<div class="confirm-copy-note">' + escHtml(t('modalApplyAllOneOffLine')) + '</div>';
}

function openApplyToAllSkillModal() {
  if (!state.selectedProjectId || !state.currentSkillId) return;
  renderApplyToAllConfirmation();
  document.getElementById('applyAllSkillModal').classList.add('visible');
}

function closeApplyToAllSkillModal() {
  document.getElementById('applyAllSkillModal').classList.remove('visible');
}

function formatApplyToAllSummary(data) {
  const updated = Number(data && data.updatedTargets || 0);
  const skipped = Number(data && data.skippedTargets || 0);
  const failed = Number(data && data.failedTargets || 0);
  if (currentLang === 'zh') {
    const parts = [
      t('modalApplyAllSummaryPrefix'),
      String(updated) + t('modalApplyAllSummaryUpdated'),
      '，',
      String(skipped) + t('modalApplyAllSummarySkipped'),
    ];
    if (failed > 0) {
      parts.push('，', String(failed) + t('modalApplyAllSummaryFailed'));
    }
    return parts.join('');
  }

  const parts = [
    t('modalApplyAllSummaryPrefix'),
    ' ',
    String(updated),
    ' ',
    t('modalApplyAllSummaryUpdated'),
    ', ',
    String(skipped),
    ' ',
    t('modalApplyAllSummarySkipped'),
  ];
  if (failed > 0) {
    parts.push(', ', String(failed), ' ', t('modalApplyAllSummaryFailed'));
  }
  return parts.join('');
}

async function refreshCurrentSkillModal(runtime, successHint) {
  if (!state.selectedProjectId || !state.currentSkillId) return;
  const snapshot = await loadProjectSnapshot(state.selectedProjectId, { force: true });
  if (snapshot && state.selectedMainTab === 'skills') {
    updateSkillsList();
  }
  await viewSkill(state.selectedProjectId, state.currentSkillId, runtime);
  const hintEl = document.getElementById('modalSaveHint');
  if (hintEl && successHint) {
    hintEl.textContent = successHint;
  }
}

async function saveCurrentSkill() {
  if (!state.selectedProjectId || !state.currentSkillId) return;

  const saveBtn = document.getElementById('modalSaveBtn');
  const applyAllBtn = document.getElementById('modalApplyAllBtn');
  const hintEl = document.getElementById('modalSaveHint');
  const contentEl = document.getElementById('modalContent');
  const content = contentEl && contentEl.value ? contentEl.value : '';
  const runtime = state.currentSkillRuntime || 'codex';

  saveBtn.disabled = true;
  if (applyAllBtn) {
    applyAllBtn.disabled = true;
  }
  hintEl.textContent = t('modalSaving');

  try {
    const encProject = encodeURIComponent(state.selectedProjectId);
    const encSkill = encodeURIComponent(state.currentSkillId);
    const data = await fetchJsonWithTimeout('/api/projects/' + encProject + '/skills/' + encSkill + '?runtime=' + encodeURIComponent(runtime), 12000, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content,
        runtime: runtime,
        reason: t('modalManualEditReason'),
      }),
    });
    const successHint = data.unchanged
      ? t('modalNoChanges')
      : (t('modalSavedVersionPrefix') + data.version);
    await refreshCurrentSkillModal(runtime, successHint);
  } catch (e) {
    console.error('[dashboard] failed to save skill content', {
      projectPath: state.selectedProjectId,
      skillId: state.currentSkillId,
      runtime: runtime,
      error: String(e),
    });
    hintEl.textContent = t('modalSaveFailed');
  } finally {
    saveBtn.disabled = false;
    if (applyAllBtn) {
      applyAllBtn.disabled = false;
    }
  }
}

async function confirmApplyCurrentSkillToAll() {
  if (!state.selectedProjectId || !state.currentSkillId) return;

  const saveBtn = document.getElementById('modalSaveBtn');
  const applyAllBtn = document.getElementById('modalApplyAllBtn');
  const confirmBtn = document.getElementById('applyAllConfirmBtn');
  const cancelBtn = document.getElementById('applyAllCancelBtn');
  const hintEl = document.getElementById('modalSaveHint');
  const contentEl = document.getElementById('modalContent');
  const content = contentEl && contentEl.value ? contentEl.value : '';
  const runtime = state.currentSkillRuntime || 'codex';

  saveBtn.disabled = true;
  if (applyAllBtn) {
    applyAllBtn.disabled = true;
  }
  if (confirmBtn) {
    confirmBtn.disabled = true;
  }
  if (cancelBtn) {
    cancelBtn.disabled = true;
  }
  hintEl.textContent = t('modalApplyAllRunning');

  try {
    const encProject = encodeURIComponent(state.selectedProjectId);
    const encSkill = encodeURIComponent(state.currentSkillId);
    const data = await fetchJsonWithTimeout('/api/projects/' + encProject + '/skills/' + encSkill + '/apply-to-all?runtime=' + encodeURIComponent(runtime), 30000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content,
        runtime: runtime,
        reason: t('modalManualEditReason'),
      }),
    });
    closeApplyToAllSkillModal();
    await refreshCurrentSkillModal(runtime, formatApplyToAllSummary(data));
  } catch (e) {
    console.error('[dashboard] failed to apply skill content to same-named skills', {
      projectPath: state.selectedProjectId,
      skillId: state.currentSkillId,
      runtime: runtime,
      error: String(e),
    });
    hintEl.textContent = t('modalApplyAllFailed');
  } finally {
    saveBtn.disabled = false;
    if (applyAllBtn) {
      applyAllBtn.disabled = false;
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
    }
    if (cancelBtn) {
      cancelBtn.disabled = false;
    }
  }
}

function closeModal() {
  document.getElementById('skillModal').classList.remove('visible');
}

document.getElementById('skillModal').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('applyAllSkillModal').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) closeApplyToAllSkillModal();
});
document.getElementById('eventModal').addEventListener('click', function(e) {
  if (e.target === e.currentTarget) closeEventModal();
});
`;

export function renderDashboardSkillsSource(): string {
  return DASHBOARD_SKILLS_SOURCE;
}
