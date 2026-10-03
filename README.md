# Free-first Economy Router (OpenClaw plugin pattern)

A design pattern / recipe for a **cost-aware LLM model router** implemented as an
[OpenClaw](https://openclaw.ai) plugin. It hooks `before_model_resolve` and chooses the
cheapest capable model **before** each request is sent, so the bulk of traffic goes to
**free / low-cost** models while premium or quota-limited models are reserved for the
requests that genuinely need them.

This repository documents the **mechanism** so others can reproduce it. It intentionally
contains no build artifact, no provider names, and no site-specific configuration.

## The idea
Most agent traffic is cheap work (short classifications, routine tool chatter, simple
rewrites). Sending all of it to a premium model wastes budget or burns a limited quota.
A small router in front of model resolution can keep that traffic on free tiers and only
escalate when a request actually warrants it.

## How it works
1. **Hook the request.** In `before_model_resolve`, inspect the pending request
   (prompt shape, task hints, size) before a model is chosen.
2. **Ask a lightweight "decider".** A small, fast model classifies the request and returns
   a target profile plus a confidence score. Keep the prompt sent to the decider small
   (cap the characters) so the decider itself stays cheap.
3. **Route to a profile.** Maintain a set of **model profiles**, each tagged with a rough
   cost/quality, and pick the cheapest profile that clears the task. Bias the selection
   toward free tiers (an "economy" optimization mode).
4. **Fail open.** If the decider is unsure (confidence below a threshold), times out, or is
   unreachable, fall through to the gateway's normal resolution instead of breaking the
   request.
5. **Log every decision.** Emit one structured line per decision
   (`chosen profile`, `via which decider`, `confidence`) so routing quality can be audited
   and tuned from logs.

## Useful refinements
- **Decider failover.** Put a second decider behind the first so transient rate limits on
  one provider don't stall routing.
- **Per-agent pinning / exclusion.** Let specific agents **opt out** of routing and keep a
  pinned model — e.g. an agent bound to a particular backend, or a coding agent whose model
  chain must not be overridden. Make the exclusion list **configuration**, not hard-coded,
  so the plugin stays reusable.
- **Escalation profiles.** Define a small number of premium profiles the router may escalate
  to, used only when the decider is confident the task needs them.

## Configuration, not code
Keep the moving parts — the model profiles, the decider model(s), timeouts, the minimum
confidence, the escalation targets, and any per-agent exclusions — in the gateway
configuration (`openclaw.json`), not baked into the plugin. That keeps the plugin generic
and your provider/agent choices private.

## Tuning loop
Because every decision is logged, you can periodically review the distribution
(which profiles were chosen, how many fell open, confidence spread) and adjust profile
descriptions or cost/quality tags from evidence — no rebuild required, just config.

## Scope of this repo
Pattern documentation only. There is no vendor lock-in here and no reference to any specific
provider, model, or agent — adapt it to whatever free and premium models you have access to.

## License
MIT — do what you like; attribution appreciated.
