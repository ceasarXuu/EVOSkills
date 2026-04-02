# OrnnSkills Architecture

## Module Dependency Graph

```
CLI (src/cli/)
├── commands/ (12 commands: status, diff, freeze, rollback, sync, preview, log, logs, daemon, config, completion)
└── index.ts (Commander program setup)

Core Pipeline
┌─────────────────────────────────────────────────────────────────┐
│ TraceSkillObserver (src/core/observer/)                        │
│   ├── TraceManager        — SQLite trace storage               │
│   └── TraceSkillMapper    — Maps traces to skills              │
│                                                                 │
│ ShadowManager (src/core/shadow-manager/)                       │
│   ├── ShadowRegistry      — Shadow skill CRUD                  │
│   ├── Journal             — Evolution history                  │
│   ├── TraceManager        — (shared via observer)              │
│   └── TraceSkillMapper    — (shared via observer)              │
│                                                                 │
│ Pipeline (src/core/pipeline/)                                  │
│   ├── Analyzer            — LLM-based skill analysis           │
│   ├── PatchGenerator      — Strategy-based patch generation    │
│   ├── Evaluator           — Patch quality evaluation           │
│   └── Router              — LLM-based trace routing            │
└─────────────────────────────────────────────────────────────────┘

Supporting Modules
├── OriginRegistry    — Original skill management
├── ShadowRegistry    — Shadow skill index & storage
├── SkillVersion      — Version control for skills
├── SkillDeployer     — Deploy to target runtimes
├── SkillEvolution    — Evolution thread & manager
├── UserConfirmation  — Interactive approval flow
├── Config            — TOML-based configuration
├── Storage           — SQLite, Markdown, NDJSON adapters
└── Daemon            — Background optimization daemon

Data Flow
───────────
1. Observer detects runtime traces (Codex/Claude sessions)
2. TraceManager stores traces in SQLite
3. TraceSkillMapper maps traces to specific skills
4. Pipeline analyzes usage patterns via LLM
5. PatchGenerator creates optimization patches
6. Evaluator validates patch quality
7. ShadowRegistry stores optimized shadows
8. Journal records evolution history
9. UserConfirmation gates deployment
10. SkillDeployer applies to target runtime

Initialization Lifecycle
─────────────────────────
All core modules follow: async init(): Promise<void>
- ShadowRegistry.init() — sync, loads index from JSON
- Journal.init()        — async, opens SQLite connection
- TraceManager.init()   — async, opens SQLite connection
- TraceSkillMapper.init() — async, loads mapping data
- ShadowManager.init()  — async, initializes all sub-components
- Pipeline.init()       — async, initializes all sub-components
- Daemon.start()        — async, starts observer + cleanup loop
```
