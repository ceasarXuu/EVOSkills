import { describe, expect, it } from "vitest";

import {
  DEFAULT_DASHBOARD_PROMPT_SOURCES,
  DEFAULT_DASHBOARD_PROMPT_OVERRIDES,
  hasPromptConfiguration,
  hasPromptOverrides,
  normalizePromptSourcesFromConfig,
  normalizePromptOverridesFromConfig,
  resolveDashboardPromptSources,
  resolveDashboardPromptOverrides,
} from "../../src/config/prompt-overrides.js";

describe("config prompt overrides", () => {
  it("resolves prompt overrides by trimming known fields and defaulting missing values", () => {
    expect(
      resolveDashboardPromptOverrides({
        skillCallAnalyzer: "  return json only  ",
        decisionExplainer: "  summarize briefly ",
      })
    ).toEqual({
      skillCallAnalyzer: "return json only",
      decisionExplainer: "summarize briefly",
      readinessProbe: "",
    });
  });

  it("normalizes prompt overrides from mixed snake_case and camelCase config keys", () => {
    expect(
      normalizePromptOverridesFromConfig({
        prompt_overrides: {
          skill_call_analyzer: "  follow project policy ",
          decisionExplainer: " keep the answer short ",
          readiness_probe: "  wait for stable evidence  ",
        },
      })
    ).toEqual({
      skillCallAnalyzer: "follow project policy",
      decisionExplainer: "keep the answer short",
      readinessProbe: "wait for stable evidence",
    });
  });

  it("detects whether any prompt override is configured", () => {
    expect(hasPromptOverrides(DEFAULT_DASHBOARD_PROMPT_OVERRIDES)).toBe(false);
    expect(
      hasPromptOverrides({
        ...DEFAULT_DASHBOARD_PROMPT_OVERRIDES,
        readinessProbe: "use trace history",
      })
    ).toBe(true);
  });

  it("resolves prompt sources by defaulting missing values to built_in", () => {
    expect(
      resolveDashboardPromptSources({
        skillCallAnalyzer: "custom",
      })
    ).toEqual({
      skillCallAnalyzer: "custom",
      decisionExplainer: "built_in",
      readinessProbe: "built_in",
    });
  });

  it("normalizes prompt sources from mixed snake_case and camelCase config keys", () => {
    expect(
      normalizePromptSourcesFromConfig({
        prompt_overrides: {
          skill_call_analyzer_source: "custom",
          decisionExplainerSource: "built_in",
          readiness_probe_source: "custom",
        },
      })
    ).toEqual({
      skillCallAnalyzer: "custom",
      decisionExplainer: "built_in",
      readinessProbe: "custom",
    });
  });

  it("detects whether any non-default prompt configuration is configured", () => {
    expect(
      hasPromptConfiguration(
        DEFAULT_DASHBOARD_PROMPT_OVERRIDES,
        DEFAULT_DASHBOARD_PROMPT_SOURCES
      )
    ).toBe(false);
    expect(
      hasPromptConfiguration(
        {
          ...DEFAULT_DASHBOARD_PROMPT_OVERRIDES,
          readinessProbe: "You are a custom readiness probe.",
        },
        {
          ...DEFAULT_DASHBOARD_PROMPT_SOURCES,
          readinessProbe: "custom",
        }
      )
    ).toBe(true);
  });
});
