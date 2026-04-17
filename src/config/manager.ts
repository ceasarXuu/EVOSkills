/**
 * Configuration Manager
 * Manages multi-provider configuration with append/override logic
 */

export type {
  DashboardConfig,
  DashboardProviderConfig,
  OrnnConfig,
  ProviderConfig,
} from "./dashboard-config.js";
export {
  generateConfigContent,
  getDefaultProvider,
  listConfiguredProviders,
  readConfig,
  readDashboardConfig,
  setDefaultProvider,
  writeConfig,
  writeDashboardConfig,
} from "./dashboard-config.js";
export type {
  DashboardPromptOverrides,
  DashboardPromptSource,
  DashboardPromptSources,
} from "./prompt-overrides.js";
export {
  DEFAULT_DASHBOARD_PROMPT_SOURCES,
  DEFAULT_DASHBOARD_PROMPT_OVERRIDES,
  hasPromptConfiguration,
  normalizePromptSourcesFromConfig,
  resolveDashboardPromptOverrides,
  resolveDashboardPromptSources,
} from "./prompt-overrides.js";
export { generateEnvContent, getProviderEnvVarName, writeEnvFile } from "./env-file.js";
export type { ProviderConnectivityResult } from "./provider-connectivity.js";
export { checkProvidersConnectivity } from "./provider-connectivity.js";
