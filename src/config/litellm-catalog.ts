/**
 * LiteLLM Catalog Loader
 *
 * Load provider/model catalog from LiteLLM official model registry.
 * Source of truth:
 * https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json
 */

import { createChildLogger } from "../utils/logger.js";
import { getAllProviders } from "./providers.js";

const logger = createChildLogger("litellm-catalog");

const LITELLM_MODEL_REGISTRY_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

interface LiteLLMModelMeta {
  litellm_provider?: string;
  mode?: string;
  max_input_tokens?: number;
  max_output_tokens?: number;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  supports_reasoning?: boolean;
  supports_function_calling?: boolean;
  supports_prompt_caching?: boolean;
  supports_response_schema?: boolean;
  supports_native_structured_output?: boolean;
  supports_vision?: boolean;
  supports_web_search?: boolean;
}

interface LiteLLMModelDetail {
  id: string;
  mode: string | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  inputCostPerToken: number | null;
  outputCostPerToken: number | null;
  supportsReasoning: boolean;
  supportsFunctionCalling: boolean;
  supportsPromptCaching: boolean;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  supportsWebSearch: boolean;
}

interface CatalogEntry {
  id: string;
  name: string;
  models: string[];
  modelDetails: LiteLLMModelDetail[];
  defaultModel: string;
  apiKeyEnvVar: string;
}

let cachedAt = 0;
let cachedCatalog: CatalogEntry[] = [];

function providerToEnvVar(providerId: string): string {
  return `${providerId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
}

function buildCatalogFromRegistry(
  registry: Record<string, LiteLLMModelMeta>
): CatalogEntry[] {
  const map = new Map<string, Map<string, LiteLLMModelDetail>>();

  for (const [modelName, meta] of Object.entries(registry)) {
    if (!modelName || modelName.startsWith("sample_spec")) continue;
    const provider =
      (meta.litellm_provider && String(meta.litellm_provider).trim()) ||
      (modelName.includes("/") ? modelName.split("/")[0] : "");
    if (!provider) continue;
    if (!map.has(provider)) map.set(provider, new Map<string, LiteLLMModelDetail>());
    map.get(provider)?.set(modelName, {
      id: modelName,
      mode: typeof meta.mode === "string" ? meta.mode : null,
      maxInputTokens: typeof meta.max_input_tokens === "number" ? meta.max_input_tokens : null,
      maxOutputTokens: typeof meta.max_output_tokens === "number" ? meta.max_output_tokens : null,
      inputCostPerToken: typeof meta.input_cost_per_token === "number" ? meta.input_cost_per_token : null,
      outputCostPerToken: typeof meta.output_cost_per_token === "number" ? meta.output_cost_per_token : null,
      supportsReasoning: meta.supports_reasoning === true,
      supportsFunctionCalling: meta.supports_function_calling === true,
      supportsPromptCaching: meta.supports_prompt_caching === true,
      supportsStructuredOutput:
        meta.supports_native_structured_output === true || meta.supports_response_schema === true,
      supportsVision: meta.supports_vision === true,
      supportsWebSearch: meta.supports_web_search === true,
    });
  }

  return [...map.entries()]
    .map(([provider, modelMap]) => {
      const modelDetails = [...modelMap.values()].sort((a, b) => a.id.localeCompare(b.id));
      const models = modelDetails.map((item) => item.id);
      return {
        id: provider,
        name: provider,
        models,
        modelDetails,
        defaultModel: models[0] || "",
        apiKeyEnvVar: providerToEnvVar(provider),
      };
    })
    .filter((entry) => entry.models.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeFallbackModelId(providerId: string, modelName: string): string {
  return modelName.includes("/") ? modelName : `${providerId}/${modelName}`;
}

function buildFallbackCatalog(): CatalogEntry[] {
  return getAllProviders()
    .map((provider) => {
      const models = provider.models.map((model) => normalizeFallbackModelId(provider.id, model));
      return {
        id: provider.id,
        name: provider.name || provider.id,
        models,
        modelDetails: models.map((model) => ({
          id: model,
          mode: null,
          maxInputTokens: null,
          maxOutputTokens: null,
          inputCostPerToken: null,
          outputCostPerToken: null,
          supportsReasoning: false,
          supportsFunctionCalling: false,
          supportsPromptCaching: false,
          supportsStructuredOutput: false,
          supportsVision: false,
          supportsWebSearch: false,
        })),
        defaultModel: normalizeFallbackModelId(provider.id, provider.defaultModel),
        apiKeyEnvVar: provider.apiKeyEnvVar || providerToEnvVar(provider.id),
      };
    })
    .filter((entry) => entry.models.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getLiteLLMCatalog(forceRefresh = false): Promise<CatalogEntry[]> {
  const now = Date.now();
  if (!forceRefresh && cachedCatalog.length > 0 && now - cachedAt < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(LITELLM_MODEL_REGISTRY_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`LiteLLM catalog fetch failed: HTTP ${response.status}`);
    }

    const body = (await response.json()) as Record<string, LiteLLMModelMeta>;
    const catalog = buildCatalogFromRegistry(body);
    if (catalog.length === 0) {
      throw new Error("LiteLLM catalog parse failed: empty provider list");
    }

    cachedCatalog = catalog;
    cachedAt = now;
    logger.info("LiteLLM catalog refreshed", {
      providerCount: catalog.length,
      modelCount: catalog.reduce((acc, item) => acc + item.models.length, 0),
    });
    return catalog;
  } catch (error) {
    const fallbackCatalog = cachedCatalog.length > 0 ? cachedCatalog : buildFallbackCatalog();
    logger.warn("LiteLLM catalog remote fetch unavailable, using fallback catalog", {
      error: error instanceof Error ? error.message : String(error),
      providerCount: fallbackCatalog.length,
      source: cachedCatalog.length > 0 ? "cache" : "bundled",
    });
    return fallbackCatalog;
  } finally {
    clearTimeout(timer);
  }
}
