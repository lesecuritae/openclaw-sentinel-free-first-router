import { createRouter } from "./router.js";

export default {
  id: "openclaw-sentinel-free-first-router",
  name: "OpenClaw Sentinel Free-First Router",
  description: "Choose the least costly capable model profile. Voluntary Monero donations for development: see README.",
  register(api) {
    const config = api.pluginConfig ?? {};
    const handler = createRouter(config, { logger: api.logger });
    api.on("before_model_resolve", handler, {
      timeoutMs: Math.min((config.decider?.timeoutMs ?? 4000) + 500, 10500)
    });
  }
};
