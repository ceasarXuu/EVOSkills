export interface DashboardPromptOverrides {
  skillCallAnalyzer: string;
  decisionExplainer: string;
  readinessProbe: string;
}

export type DashboardPromptSource = "built_in" | "custom";

export interface DashboardPromptSources {
  skillCallAnalyzer: DashboardPromptSource;
  decisionExplainer: DashboardPromptSource;
  readinessProbe: DashboardPromptSource;
}

export interface PromptOverridesConfigInput {
  prompt_overrides?: Record<string, unknown> | null;
}

export const DEFAULT_DASHBOARD_PROMPT_OVERRIDES: DashboardPromptOverrides = {
  skillCallAnalyzer: "",
  decisionExplainer: "",
  readinessProbe: "",
};

export const DEFAULT_DASHBOARD_PROMPT_SOURCES: DashboardPromptSources = {
  skillCallAnalyzer: "built_in",
  decisionExplainer: "built_in",
  readinessProbe: "built_in",
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

function readPromptSource(
  raw: Record<string, unknown>,
  snakeCaseKey: string,
  camelCaseKey: string
): DashboardPromptSource | undefined {
  const value = readString(raw, snakeCaseKey, camelCaseKey);
  return value === "custom" ? "custom" : value === "built_in" ? "built_in" : undefined;
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

export function resolveDashboardPromptSources(
  promptSources?: Partial<DashboardPromptSources> | null
): DashboardPromptSources {
  const raw = promptSources && typeof promptSources === "object" ? promptSources : {};
  return {
    skillCallAnalyzer: raw.skillCallAnalyzer === "custom" ? "custom" : "built_in",
    decisionExplainer: raw.decisionExplainer === "custom" ? "custom" : "built_in",
    readinessProbe: raw.readinessProbe === "custom" ? "custom" : "built_in",
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

export function normalizePromptSourcesFromConfig(
  config: PromptOverridesConfigInput | null | undefined
): DashboardPromptSources {
  const raw = config?.prompt_overrides;
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_DASHBOARD_PROMPT_SOURCES };
  }

  return resolveDashboardPromptSources({
    skillCallAnalyzer: readPromptSource(
      raw,
      "skill_call_analyzer_source",
      "skillCallAnalyzerSource"
    ),
    decisionExplainer: readPromptSource(
      raw,
      "decision_explainer_source",
      "decisionExplainerSource"
    ),
    readinessProbe: readPromptSource(raw, "readiness_probe_source", "readinessProbeSource"),
  });
}

export function hasPromptOverrides(promptOverrides: DashboardPromptOverrides): boolean {
  return Object.values(promptOverrides).some((value) => value.trim().length > 0);
}

export function hasPromptConfiguration(
  promptOverrides: DashboardPromptOverrides,
  promptSources: DashboardPromptSources
): boolean {
  return (
    hasPromptOverrides(promptOverrides) ||
    Object.values(promptSources).some((value) => value !== "built_in")
  );
}
