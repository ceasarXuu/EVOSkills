# OrnnSkills Presentation Pack

## 1. One-Line Positioning

OrnnSkills is a local background meta-agent that turns generic AI agent skills into project-specific, continuously improving shadow skills without requiring users to manage branching, merges, or manual tuning.

## 2. Project Intro

**Project name:** OrnnSkills  
**Product type:** Developer infrastructure for AI agent workflows  
**Delivery form:** CLI + background daemon + local dashboard  
**Current maturity:** Implemented prototype with substantial MVP surface; demoable and operable in a local developer workflow, but should not be overclaimed as a scaled commercial product yet

OrnnSkills is built around a simple product promise: a user installs generic skills once, then each project gradually develops its own better-fitting version in the background. The system observes real agent execution traces, maps those traces back to the relevant skill, applies constrained optimization to the project-local shadow copy, and preserves a rollbackable journal of every change.

This matters because skill libraries degrade quickly when they are either too generic or manually forked per project. OrnnSkills tries to solve that operational burden by making skill adaptation continuous, local, and reversible.

## 3. Target User And Core Scenario

**Target user**

- AI coding power users working with Codex, Claude, or OpenCode
- Developers or small teams maintaining reusable skill libraries
- Workflow owners who want project-specific adaptation without polluting global skills

**Core scenario**

A developer uses a generic skill across multiple repositories. In one project, the agent repeatedly works around part of that skill, applies manual fixes, or needs extra project context. OrnnSkills detects the pattern from execution traces, updates the project-local shadow skill with a small patch, records the change, and keeps the original global skill untouched.

## 4. Repo Fact Sheet

| Field | Summary | Claim language |
|---|---|---|
| Primary job | Continuously optimize project-local shadow skills based on observed agent traces | implemented |
| User interface | `ornn` CLI, local daemon control, logs, rollback, preview, dashboard | implemented |
| Runtime model | Local-first Node.js service with file watching, local storage, and background processing | implemented |
| Supported agent context | Codex, Claude, OpenCode traces and skill paths | implemented |
| Optimization method | Rule-driven patching plus LLM-assisted analysis paths | implemented |
| Storage model | Local SQLite + NDJSON + Markdown skill files + journal snapshots | implemented |
| Commercial posture | Developer tooling / agent infrastructure / workflow optimization layer | inferred |
| Network dependency | Optional for provider validation and LLM-powered analysis paths | implemented |
| Multi-user / cloud collaboration | Not proven in repo evidence | should not overclaim |
| Market traction | No evidence in repo | should not overclaim |

## 5. Core Modules

### 5.1 Observation Layer

- Runtime-specific observers capture external agent execution traces.
- A project observer and trace manager aggregate traces into the local project state.
- The product is intentionally built around visible execution behavior, not hidden chain-of-thought.

### 5.2 Trace-To-Skill Mapping

- A dedicated mapper uses six mapping strategies with confidence scoring.
- It can infer the relevant skill from file reads, file changes, metadata, tool calls, assistant output, and user input.
- This is the critical bridge that makes autonomous optimization possible instead of just passive logging.

### 5.3 Shadow Skill Management

- Global or project skill sources are scanned and normalized into a project-local shadow registry.
- For each skill and runtime, OrnnSkills can create, sync, materialize, version, freeze, unfreeze, and rollback the project-specific copy.
- Global skills remain the source of truth, while project copies are the safe place for adaptation.

### 5.4 Evaluation And Patch Pipeline

- Recent traces are evaluated for optimization signals such as repeated drift or repeated manual fixes.
- Patch generation is deliberately constrained to small, interpretable change types like `append_context`, `tighten_trigger`, `add_fallback`, and `prune_noise`.
- This design reduces the chance that automation silently rewrites the core purpose of a skill.

### 5.5 Versioning, Journal, And Deployment

- Each change is recorded in an append-only journal with hashes, rationale, source sessions, and patch metadata.
- Periodic snapshots and rollback support give the system a recovery path.
- Optimized versions can then be deployed back into the runtime-specific skill location.

### 5.6 Operator Surface

- The CLI exposes init, start/stop/restart, status, logs, config, preview, sync, diff, rollback, freeze, and dashboard commands.
- A lightweight HTTP dashboard adds project discovery, real-time SSE updates, logs, traces, skill state, and provider health visibility.

## 6. Architecture Snapshot

### User-facing architecture summary

The architecture is designed around one product-level promise: project adaptation without global pollution. That drives three major decisions.

First, observation is separated from execution. OrnnSkills does not try to replace the main agent. It watches what the main agent actually does and learns from those traces.

Second, optimization is applied to local shadow copies rather than origin skills. That makes project-specific adaptation safe and reversible.

Third, the system favors small-step changes with explicit journals and snapshots. That makes the automation inspectable instead of magical.

### System flow

1. The user initializes OrnnSkills inside a project.
2. The daemon scans available skill sources and creates or syncs shadow skills.
3. Observers collect runtime traces from Codex, Claude, or OpenCode activity.
4. The mapper assigns traces to likely skills with confidence scores.
5. Evaluation logic identifies whether a skill should be patched.
6. A constrained patch or LLM-guided optimization generates a new skill version.
7. The system records the change, updates revisions, and can deploy the optimized version.
8. CLI and dashboard surfaces expose status, logs, diffs, previews, and rollback.

### Why the architecture matters

- For users: they get evolving project-fit behavior without managing skill forks manually.
- For teams: local isolation lowers the risk of breaking shared skill libraries.
- For operators: journaling and rollback keep the automation auditable.

## 7. Highlights

### Product highlights

- Solves a real workflow gap between generic skill registries and project-specific execution needs.
- Frames skills as living project assets instead of static templates.
- Minimizes user cognitive load by hiding branching and lifecycle complexity behind a shadow-copy model.

### Technical highlights

- Multi-strategy trace-skill mapping is a meaningful systems feature, not just glue code.
- The product combines local filesystem observation, routing, evaluation, patching, versioning, and deployment into one loop.
- It supports both deterministic patching and LLM-assisted analysis, which gives it a path from safe heuristics to smarter optimization.

### Commercial highlights

- Clear fit for the rise of agentic development workflows.
- Addresses a painful maintenance cost for users who accumulate many reusable prompts or skills.
- Local-first architecture can appeal to users who are uncomfortable sending workflow traces to a hosted service.

### Execution highlights

- The repository shows working CLI ergonomics, CI, unit coverage, agent-focused PoC tests, dashboard infrastructure, and logging.
- The codebase demonstrates clear modular decomposition instead of a monolithic prototype script.

## 8. Challenges And Risks

### Product risks

- The product depends on users already working with reusable skill systems; this narrows the first wedge.
- Value may be hard to perceive if optimization quality is subtle or infrequent.
- Some users may prefer explicit manual editing over autonomous adaptation unless trust is earned.

### Engineering risks

- Trace quality and runtime compatibility are foundational; weak trace capture degrades the whole loop.
- Confidence-based mapping can still produce false positives in ambiguous workflows.
- LLM-assisted optimization introduces cost, latency, and consistency risk compared with the deterministic patch path.

### Commercialization risks

- The repo shows strong technical direction but no evidence yet of distribution, pricing, or usage traction.
- Local-first tooling can create adoption strength with power users, but may slow collaboration and enterprise rollout unless a team layer is later added.
- The current story is strongest for technically sophisticated users; mainstream users may need a more guided UX.

## 9. Investor Version

OrnnSkills is building infrastructure for the next layer of agentic development: not better one-off prompts, but self-improving project-specific skill systems. The product sits behind existing coding agents and continuously tunes reusable skills based on actual execution traces. That creates a durable workflow advantage for power users and teams that rely on skill libraries across many repositories.

What is implemented today is credible for an early infrastructure product: local trace observation, skill mapping, shadow-copy isolation, optimization logic, journaling, rollback, dashboard visibility, and a usable CLI surface. The next business question is not whether the loop exists, but which segment feels the pain most acutely: solo AI-native developers, platform teams standardizing internal agent workflows, or skill-library heavy agencies.

## 10. User Version

OrnnSkills helps your AI agent get better at using the same skill inside a specific project. You keep your original global skills untouched, while each repository gets a local shadow version that can improve over time from real usage. If the automation makes a bad change, you can inspect the diff, read the journal, or roll back.

In practice, this means less repetitive manual tuning, less copy-paste branching of skills, and a cleaner way to keep project-specific context close to the place where it matters.

## 11. Demo Version

### Demo story

Start with a generic skill installed globally. Initialize OrnnSkills in a repository, start the daemon, and show that the project gets its own shadow skill. Then walk through traces being observed, mapped, and surfaced in status or dashboard views. Finally, show a patch being applied, a version/journal entry being created, and the ability to diff or roll back.

### Demo path

1. `ornn init`
2. `ornn start`
3. `ornn status`
4. `ornn skills status`
5. Trigger or inspect traces
6. `ornn skills log <skill-id>`
7. `ornn skills diff <skill-id>`
8. `ornn skills rollback <skill-id> --to <revision>`

### Feature-to-value mapping

- Trace observation: learns from real behavior rather than guessed best practice
- Shadow copy isolation: project tuning without contaminating global skills
- Small-step patching: safer autonomous evolution
- Journal + rollback: trust and control
- Dashboard: easier inspection and demos

## 12. Elevator Pitches

### 15-second pitch

OrnnSkills is a background meta-agent that watches how your coding agent actually uses skills, then automatically improves a project-local shadow copy so the same skill gets better for that repo over time.

### 60-second pitch

AI coding users increasingly rely on reusable skills, but those skills break down because every project needs slightly different instructions. Today, people solve that by manually forking, copy-pasting, and re-editing skill files. OrnnSkills replaces that maintenance burden with a local background system. It observes real execution traces from tools like Codex or Claude, maps those traces to the right skill, applies small reversible improvements to a project-local shadow copy, and keeps a journaled version history with rollback. The result is a workflow where generic skills become project-fit over time without polluting the original global registry.

## 13. Implemented Vs Planned

| Area | Status | Notes |
|---|---|---|
| CLI initialization and control surface | implemented | `init`, daemon lifecycle, logs, config, dashboard, skill commands |
| Local daemon and background observation | implemented | File watching, checkpoints, retry queue, cleanup loop |
| Multi-runtime trace observation | implemented | Codex and Claude observer modules exist; README claims OpenCode support and path/runtime support is present |
| Trace-skill mapping with confidence scoring | implemented | Six mapping strategies documented and wired into the pipeline |
| Project-local shadow skill creation and sync | implemented | Bootstrap, materialization, registry, runtime-scoped copies |
| Rule-based evaluation and constrained patch generation | implemented | Evaluator rules plus patch strategy modules |
| Journal, snapshot, diff, rollback | implemented | Core journal/versioning and CLI commands present |
| Dashboard with live updates | implemented | HTTP server + SSE + project registry + data readers |
| LLM-assisted analyzer and optimization flow | implemented | Analyzer agent, prompt builder, output parser, Phase 5 integration |
| Hosted SaaS / multi-user collaboration | not evidenced | Should not overclaim from current repo |
| Pricing, sales motion, customer proof | not evidenced | Should not overclaim from current repo |
| More advanced autonomous productization around team workflows | planned/inferred | Logical next step, but not proven in repo docs |

## 14. FAQ

### Is this another coding agent?

No. The repo consistently frames OrnnSkills as a meta-agent that observes and improves skills used by another primary agent.

### Why not just edit the skill manually?

You can. The product value is reducing repeated manual tuning and preserving a rollbackable, project-local evolution history.

### Why shadow copies instead of branches?

Because the design goal is low user cognitive load. The system avoids exposing users to branch management for routine adaptation.

### Is the optimization fully autonomous?

Partly, and with constraints. Deterministic patching is intentionally narrow, while LLM-assisted analysis expands capability but also adds risk and cost.

### Does the repo prove product-market fit?

No. It proves a coherent product direction and a meaningful amount of working infrastructure.

## 15. Evidence Map

| Claim | Grade | Evidence |
|---|---|---|
| OrnnSkills is a local background meta-agent rather than the primary execution agent | implemented | `README.md`, `docs/PRD.md` |
| The product exposes a real CLI surface for initialization, status, rollback, logs, preview, config, and dashboard | implemented | `src/cli/index.ts`, `README.md` |
| The system runs a daemon with retries, checkpoints, cleanup, and observer wiring | implemented | `src/daemon/index.ts` |
| The product creates and manages per-project shadow skills instead of editing origin skills in place | implemented | `docs/PRD.md`, `src/core/shadow-manager/index.ts`, `src/core/phase4-integration.ts` |
| Trace-skill mapping is a core differentiating mechanism with confidence scoring | implemented | `docs/TRACE-SKILL-MAPPING.md`, `src/core/shadow-manager/index.ts`, `src/core/phase2-integration.ts` |
| Optimization is intentionally constrained to small patch types | implemented | `README.md`, `src/core/patch-generator/strategies/*` |
| Journaling, version creation, snapshots, and rollback are part of the core control loop | implemented | `README.md`, `src/core/shadow-manager/index.ts`, `src/core/phase4-integration.ts` |
| The repo includes LLM-powered analysis and multi-model experimentation | implemented | `src/core/phase5-integration.ts`, `tests/agent-poc/README.md` |
| The system includes a local operator dashboard with REST and SSE | implemented | `src/dashboard/server.ts` |
| Logging and privacy-aware sanitization are part of the infrastructure | implemented | `src/utils/logger.ts` |
| The project has baseline engineering discipline through CI, lint, typecheck, build, and tests | implemented | `.github/workflows/ci.yml`, `package.json`, `tests/unit/*` |
| OrnnSkills can be positioned as developer infrastructure for agent workflow optimization | inferred | Supported by repo behavior and module boundaries, but this is packaging language rather than an explicit company claim |
| The product has traction, customers, or enterprise readiness | should not overclaim | No repo evidence |

## 16. Claim Guardrails

- Do not claim customer traction, adoption, or revenue.
- Do not claim hosted collaboration or enterprise management features.
- Do not claim that LLM optimization is fully safe or universally correct.
- Do not claim proprietary moat solely from using third-party model providers.

