import { describe, expect, it } from "vitest";

import {
  DEFAULT_DASHBOARD_PROMPT_OVERRIDES,
  hasPromptOverrides,
  normalizePromptOverridesFromConfig,
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
});
