import { describe, expect, it, vi } from "vitest";

import { checkProvidersConnectivity } from "../../src/config/provider-connectivity.js";

describe("provider connectivity module", () => {
  it("reports a missing api key when no value is available", async () => {
    const previousApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "ambient-openai-key";
    delete process.env.OPENAI_API_KEY;

    try {
      const result = await checkProvidersConnectivity(undefined, [
        {
          provider: "openai",
          modelName: "openai/gpt-4o-mini",
          apiKeyEnvVar: "OPENAI_API_KEY",
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.ok).toBe(false);
      expect(result[0]?.message).toContain("Missing API key env var");
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previousApiKey;
      }
    }
  });

  it("uses the provider probe when an api key is supplied on the input provider", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "pong", role: "assistant" }, finish_reason: "stop", index: 0 }],
          model: "gpt-4o-mini",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const result = await checkProvidersConnectivity(undefined, [
        {
          provider: "openai",
          modelName: "openai/gpt-4o-mini",
          apiKeyEnvVar: "OPENAI_API_KEY",
          apiKey: "sk-inline-openai",
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
