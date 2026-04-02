# OrnnSkills - 项目工程摘要

**生成日期**: 2025-03-28  
**版本**: v0.1.9  
**技术栈**: TypeScript / Node.js / SQLite

---

## 1. 项目定位

OrnnSkills 是一个**后台元代理（Meta-Agent）**，用于自动优化 AI 编程助手（如 Codex、Claude Code、OpenCode）的 Skill 文件。

### 核心问题
传统 Skill 文件是静态的，无法根据实际使用效果自我改进。OrnnSkills 通过监听主代理的执行轨迹（traces），自动分析 Skill 的使用效果，并持续优化 Skill 内容。

### 解决方案
- **项目级隔离**: 每个项目拥有独立的 Shadow Skill 副本，不污染全局 Skill 注册表
- **自动演化**: 基于真实执行数据，自动识别优化机会并应用补丁
- **版本管理**: 完整的演化历史记录，支持一键回滚
- **多 Runtime 支持**: 同时支持 Codex、Claude Code、OpenCode

---

## 2. 架构快照

```
┌─────────────────────────────────────────────────────────────────┐
│                     Main Agent Runtime                           │
│              (Codex / OpenCode / Claude Code)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TraceSkillObserver                            │
│  - 监听 trace 文件变化 (JSONL)                                    │
│  - 实时映射 traces 到 skills (6种策略)                            │
│  - 聚合同一 skill 的 traces                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OptimizationPipeline                            │
│  - Trace 采集与分组                                               │
│  - Evaluator 评估优化机会                                         │
│  - 生成优化任务队列                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Shadow Skill Manager                              │
│  ├─ Origin Registry    (全局 Skill 扫描)                         │
│  ├─ Shadow Registry    (项目级 Shadow 管理)                      │
│  ├─ Evolution Thread   (单 Skill 演化生命周期)                    │
│  ├─ LLM Analyzer       (智能分析与优化建议)                       │
│  ├─ Patch Generator    (补丁生成)                                │
│  └─ Journal Manager    (演化日志与快照)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Project Shadow Skills (.ornn/skills/*)
```

---

## 3. 关键数据流

### 3.1 Trace 采集流程

```
~/.codex/sessions/*.jsonl ──┐
                            ├──► Observer ──► TraceManager ──► SQLite
~/.claude/projects/*.jsonl ──┘
```

**约束**: Observer 层 100% 保留原始数据，不做任何语义分析（架构约束 #1）

### 3.2 Trace-Skill 映射流程

| 策略 | 触发条件 | 置信度 | 说明 |
|------|----------|--------|------|
| Strategy 1 | `tool_call` 读取 skill 文件 | 0.95 | 最可靠的映射方式 |
| Strategy 2 | `tool_call` 执行 skill 相关操作 | 0.85 | 从工具参数推断 |
| Strategy 3 | `file_change` 修改 skill 文件 | 0.90 | 文件变更明确指向 skill |
| Strategy 4 | `metadata` 包含 skill_id | 0.98 | 显式 skill 标识符 |
| Strategy 5 | `assistant_output` 引用 skill | 0.60 | 从输出内容推断 |
| Strategy 6 | `user_input` 请求 skill | 0.50 | 从用户输入推断 |

### 3.3 自动优化闭环

```
1. Trace Collection    → 收集 Agent 运行时 traces
2. Trace-Skill Mapping → 智能映射到对应 skills
3. Evaluation          → 分析 trace 模式，识别优化机会
4. Task Generation     → 创建优化任务
5. Optimization        → 应用补丁到 shadow skills
6. Logging             → 保存演化历史和快照
```

---

## 4. 项目成熟度评估

### 已实现 (Implemented)

- ✅ CLI 命令体系 (`ornn init`, `ornn skills status`, `ornn skills log`, etc.)
- ✅ Observer 模块 (Codex/Claude/OpenCode 多 Runtime 支持)
- ✅ Trace-Skill Mapper (6 种映射策略)
- ✅ Optimization Pipeline (核心编排逻辑)
- ✅ Shadow Registry (项目级 Skill 管理)
- ✅ Skill Evolution Thread (单 Skill 生命周期管理)
- ✅ Patch Generator (5 种优化策略)
- ✅ Journal Manager (演化日志与快照)
- ✅ Storage Layer (SQLite + NDJSON)
- ✅ Config Management (TOML + 交互式配置)

### 部分实现 (Partial)

- ⚠️ LLM Analyzer Agent (框架完成，LLM 集成待完善)
- ⚠️ Evaluator (基础规则实现，可扩展)
- ⚠️ Daemon 模式 (基础实现，生产级需增强)

### 计划中 (Planned)

- 📋 自动部署到 Runtime (Codex/Claude skills 目录)
- 📋 Skill 市场集成
- 📋 团队协作功能
- 📋 Web UI 仪表板

---

## 5. 技术债务与风险

### 高风险

1. **LLM 集成不完整**: `llm/factory.ts` 中部分 provider 未实现，当前使用 mock 响应
2. **测试覆盖率不足**: 核心逻辑缺乏充分的单元测试和集成测试
3. **错误处理不完善**: 部分模块缺乏健壮的错误恢复机制

### 中风险

1. **性能未优化**: 大文件处理和批量操作未做性能优化
2. **并发控制**: Skill 级别并行已实现，但全局并发控制较弱
3. **配置验证**: 配置 schema 验证不够严格

### 低风险

1. **文档滞后**: 部分实现细节与文档不完全一致
2. **日志冗长**: 调试日志较多，生产环境需调整级别

---

## 6. 推荐阅读顺序

### 快速上手 (5分钟)

1. [README.md](../../README.md) - 项目概览和快速开始
2. [docs/DESIGN.md](../../docs/DESIGN.md) - 完整设计文档

### 深入理解 (30分钟)

3. [01-directory-map.md](./01-directory-map.md) - 目录结构详解
4. [02-core-logic.md](./02-core-logic.md) - 核心逻辑流程
5. [docs/ARCHITECTURE_CONSTRAINTS.md](../../docs/ARCHITECTURE_CONSTRAINTS.md) - 架构约束

### 开发参考

6. [src/types/index.ts](../../src/types/index.ts) - 核心类型定义
7. [src/core/pipeline/index.ts](../../src/core/pipeline/index.ts) - Pipeline 实现
8. [src/core/skill-evolution/thread.ts](../../src/core/skill-evolution/thread.ts) - 演化线程

---

## 7. 关键文件索引

| 文件 | 职责 | 重要性 |
|------|------|--------|
| `src/cli/index.ts` | CLI 入口 | ⭐⭐⭐ |
| `src/core/pipeline/index.ts` | 优化 Pipeline | ⭐⭐⭐ |
| `src/core/observer/project-observer.ts` | Trace 监听 | ⭐⭐⭐ |
| `src/core/trace-skill-mapper/index.ts` | Trace-Skill 映射 | ⭐⭐⭐ |
| `src/core/skill-evolution/thread.ts` | Skill 演化线程 | ⭐⭐⭐ |
| `src/core/analyzer/analyzer-agent.ts` | LLM 分析器 | ⭐⭐⭐ |
| `src/core/patch-generator/index.ts` | 补丁生成器 | ⭐⭐⭐ |
| `src/core/shadow-registry/index.ts` | Shadow Skill 管理 | ⭐⭐⭐ |
| `src/types/index.ts` | 全局类型定义 | ⭐⭐⭐ |
| `src/storage/sqlite.ts` | SQLite 存储 | ⭐⭐ |

---

*此文档由 summary-my-repo 技能自动生成*
