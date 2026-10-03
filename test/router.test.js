import test from "node:test";
import assert from "node:assert/strict";
import { createRouter, selectProfile } from "../src/router.js";
import plugin from "../src/index.js";

const config = {
  profiles: [
    { id: "standard", provider: "provider-b", model: "model-b", maxTier: 2, costRank: 10 },
    { id: "economy", provider: "provider-a", model: "model-a", maxTier: 1, costRank: 0 },
    { id: "advanced", provider: "provider-c", model: "model-c", maxTier: 3, costRank: 30 }
  ],
  decider: { endpoint: "https://example.invalid/chat/completions", model: "classifier", maxPromptChars: 100 },
  minConfidence: 0.7,
  excludedAgents: ["pinned-agent"]
};

function mockFetch(requiredTier, confidence = 0.9) {
  return async (_url, options) => {
    assert.equal(options.method, "POST");
    assert.equal(JSON.parse(options.body).model, "classifier");
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content: JSON.stringify({ requiredTier, confidence }) } }] };
      }
    };
  };
}

test("selects the cheapest capable configured profile", async () => {
  assert.equal(selectProfile(config.profiles, 1)?.id, "economy");
  assert.equal(selectProfile(config.profiles, 2)?.id, "standard");
  assert.equal(selectProfile(config.profiles, 3)?.id, "advanced");
  const handler = createRouter(config, { fetchImpl: mockFetch(1) });
  assert.deepEqual(await handler({ prompt: "Summarize this note" }), {
    providerOverride: "provider-a",
    modelOverride: "model-a"
  });
});

test("falls through on uncertainty, invalid responses, and decider failure", async () => {
  assert.equal(await createRouter(config, { fetchImpl: mockFetch(1, 0.2) })({ prompt: "hello" }), undefined);
  assert.equal(await createRouter(config, { fetchImpl: mockFetch(4) })({ prompt: "hello" }), undefined);
  assert.equal(await createRouter(config, { fetchImpl: async () => { throw new Error("network"); } })({ prompt: "hello" }), undefined);
});

test("skips excluded agents, attachments, and oversized prompts without sending data", async () => {
  const handler = createRouter(config, { fetchImpl: async () => { throw new Error("unexpected request"); } });
  assert.equal(await handler({ prompt: "hello" }, { agentId: "pinned-agent" }), undefined);
  assert.equal(await handler({ prompt: "hello", attachments: [{ kind: "image" }] }), undefined);
  assert.equal(await handler({ prompt: "x".repeat(101) }), undefined);
});

test("never sends prompts to an insecure endpoint or without a required credential", async () => {
  const fetchImpl = async () => { throw new Error("unexpected request"); };
  const insecure = createRouter({ ...config, decider: { ...config.decider, endpoint: "http://example.invalid/chat/completions" } }, { fetchImpl });
  assert.equal(await insecure({ prompt: "private" }), undefined);
  const previous = process.env.ROUTER_TEST_MISSING_KEY;
  delete process.env.ROUTER_TEST_MISSING_KEY;
  try {
    const missing = createRouter({ ...config, decider: { ...config.decider, apiKeyEnv: "ROUTER_TEST_MISSING_KEY" } }, { fetchImpl });
    assert.equal(await missing({ prompt: "private" }), undefined);
  } finally {
    if (previous !== undefined) process.env.ROUTER_TEST_MISSING_KEY = previous;
  }
});

test("does not log prompts or credentials", async () => {
  const lines = [];
  const handler = createRouter(config, {
    fetchImpl: mockFetch(2),
    logger: { debug: (line) => lines.push(line) }
  });
  await handler({ prompt: "private sample prompt" });
  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /private sample prompt|Bearer|token/i);
});

test("registers the native OpenClaw hook", () => {
  let registration;
  plugin.register({
    pluginConfig: config,
    logger: { debug() {} },
    on(name, handler, options) { registration = { name, handler, options }; }
  });
  assert.equal(registration.name, "before_model_resolve");
  assert.equal(typeof registration.handler, "function");
  assert.ok(registration.options.timeoutMs <= 10500);
});
