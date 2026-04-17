export interface DashboardPromptOverrides {
  skillCallAnalyzer: string;
  decisionExplainer: string;
  readinessProbe: string;
}

export interface PromptOverridesConfigInput {
  prompt_overrides?: Record<string, unknown> | null;
}

export const DEFAULT_DASHBOARD_PROMPT_OVERRIDES: DashboardPromptOverrides = {
  skillCallAnalyzer: "",
  decisionExplainer: "",
  readinessProbe: "",
};

function readString(
  raw: Record<string, unknown>,
  snakeCaseKey: string,
  camelCaseKey: string
): string | undefined {
  if (typeof raw[snakeCaseKey] === "string") {
    return raw[snakeCaseKey];
  }

  if (typeof raw[camelCaseKey] === "string") {
    return raw[camelCaseKey];
  }

  return undefined;
}

export function resolveDashboardPromptOverrides(
  promptOverrides?: Partial<DashboardPromptOverrides> | null
): DashboardPromptOverrides {
  const raw = promptOverrides && typeof promptOverrides === "object" ? promptOverrides : {};
  return {
    skillCallAnalyzer:
      typeof raw.skillCallAnalyzer === "string" ? raw.skillCallAnalyzer.trim() : "",
    decisionExplainer:
      typeof raw.decisionExplainer === "string" ? raw.decisionExplainer.trim() : "",
    readinessProbe:
      typeof raw.readinessProbe === "string" ? raw.readinessProbe.trim() : "",
  };
}

export function normalizePromptOverridesFromConfig(
  config: PromptOverridesConfigInput | null | undefined
): DashboardPromptOverrides {
  const raw = config?.prompt_overrides;
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_DASHBOARD_PROMPT_OVERRIDES };
  }

  return resolveDashboardPromptOverrides({
    skillCallAnalyzer: readString(raw, "skill_call_analyzer", "skillCallAnalyzer"),
    decisionExplainer: readString(raw, "decision_explainer", "decisionExplainer"),
    readinessProbe: readString(raw, "readiness_probe", "readinessProbe"),
  });
}

export function hasPromptOverrides(promptOverrides: DashboardPromptOverrides): boolean {
  return Object.values(promptOverrides).some((value) => value.trim().length > 0);
}
