# OrnnSkills - 目录结构详解

**生成日期**: 2025-03-28

---

## 1. 顶层目录概览

```
OrnnSkills/
├── .ornn/                    # 项目级 Ornn 数据（运行时生成）
├── docs/                     # 设计文档和研究笔记
├── show-my-repo/             # 产品展示材料（由 show-my-repo 技能生成）
├── src/                      # 核心源代码
├── test/                     # 测试脚本和实验代码
├── tests/                    # 正式测试套件
├── summary-my-repo/          # 本摘要文档
├── package.json              # Node.js 项目配置
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 项目说明
```

---

## 2. 源代码目录 (src/)

### 2.1 CLI 层 (src/cli/)

**职责**: 用户交互入口，命令解析和执行

```
src/cli/
├── index.ts                  # CLI 入口，Commander 初始化
└── commands/                 # 子命令实现
    ├── completion.ts         # 自动补全
    ├── config.ts             # 配置管理
    ├── daemon.ts             # 守护进程控制
    ├── diff.ts               # Skill 差异对比
    ├── freeze.ts             # 冻结/解冻 Skill
    ├── log.ts                # 查看演化日志
    ├── logs.ts               # 日志管理
    ├── preview.ts            # 预览变更
    ├── rollback.ts           # 回滚操作
    ├── status.ts             # 状态查看
    └── sync.ts               # 同步操作
```

**关键文件**:
- `index.ts`: 使用 Commander.js 构建 CLI，定义全局选项和命令注册

### 2.2 命令实现 (src/commands/)

**职责**: 独立的命令逻辑（非 CLI 子命令）

```
src/commands/
└── init.ts                   # ornn init 命令实现
```

### 2.3 配置管理 (src/config/)

**职责**: 全局和项目级配置的加载、验证和管理

```
src/config/
├── defaults.ts               # 默认配置值
├── generator.ts              # 配置生成器
├── index.ts                  # 配置管理器入口
├── manager.ts                # 配置管理实现
├── providers.ts              # LLM Provider 配置
└── wizard.ts                 # 交互式配置向导
```

**关键文件**:
- `manager.ts`: 使用 cosmiconfig 加载配置，支持 TOML 格式
- `wizard.ts`: 使用 inquirer 提供交互式配置体验

### 2.4 核心模块 (src/core/)

**职责**: 业务逻辑核心实现

```
src/core/
├── analyzer/                 # LLM 分析器
│   ├── analyzer-agent.ts     # LLM 分析 Agent
│   ├── index.ts              # 模块入口
│   ├── output-parser.ts      # 分析结果解析
│   └── prompt-builder.ts     # Prompt 构建
├── evaluator/                # 评估器
│   ├── rules/                # 评估规则
│   │   ├── repeated-drift.ts # 重复漂移检测
│   │   └── repeated-manual-fix.ts # 重复手动修复检测
│   ├── base-rule.ts          # 规则基类
│   └── index.ts              # 评估器入口
├── journal/                  # 演化日志管理
│   └── index.ts
├── observer/                 # Trace 观察者
│   ├── base-observer.ts      # 观察者基类
│   ├── claude-observer.ts    # Claude Runtime 观察者 (已弃用)
│   ├── codex-observer.ts     # Codex Runtime 观察者 (已弃用)
│   ├── index.ts              # 模块入口
│   ├── project-observer.ts   # 统一项目观察者
│   ├── trace-manager.ts      # Trace 管理器
│   └── trace-skill-observer.ts # Trace-Skill 观察者
├── origin-registry/          # 全局 Skill 注册表
│   └── index.ts
├── patch-generator/          # 补丁生成器
│   ├── strategies/           # 优化策略
│   │   ├── add-fallback.ts   # 添加回退处理
│   │   ├── append-context.ts # 追加上下文
│   │   ├── prune-noise.ts    # 修剪噪声
│   │   ├── rewrite-section.ts # 重写章节
│   │   └── tighten-trigger.ts # 收紧触发条件
│   ├── base-strategy.ts      # 策略基类
│   └── index.ts              # 补丁生成器入口
├── pipeline/                 # 优化 Pipeline
│   └── index.ts              # Pipeline 实现
├── router/                   # LLM Router
│   ├── index.ts
│   ├── llm-router-agent.ts   # LLM 路由 Agent
│   └── router.ts             # 路由实现
├── shadow-manager/           # Shadow Skill 管理器
│   └── index.ts
├── shadow-registry/          # Shadow Skill 注册表
│   └── index.ts
├── skill-deployer/           # Skill 部署器
│   └── index.ts
├── skill-evolution/          # Skill 演化管理
│   ├── index.ts
│   ├── manager.ts            # 演化管理器
│   └── thread.ts             # 单 Skill 演化线程
├── skill-version/            # Skill 版本管理
│   └── index.ts
├── trace-skill-mapper/       # Trace-Skill 映射
│   └── index.ts
├── trace-store/              # Trace 存储
│   └── index.ts
├── user-confirmation/        # 用户确认
│   └── index.ts
├── phase2-integration.ts     # Phase 2 集成
├── phase4-integration.ts     # Phase 4 集成
└── phase5-integration.ts     # Phase 5 集成
```

**关键模块详解**:

#### analyzer/
- `analyzer-agent.ts`: 使用 LLM 分析 Skill 使用 traces，生成优化建议
- `prompt-builder.ts`: 构建分析 prompt，包含 Skill 内容和 traces
- `output-parser.ts`: 解析 LLM 输出为结构化建议

#### observer/
- `project-observer.ts`: 统一的项目级观察者，替代原有的 Codex/Claude 分离实现
- `trace-manager.ts`: 管理 traces 的存储和查询
- **架构约束**: 100% 保留原始数据，不做语义分析

#### patch-generator/
- 5 种优化策略，每种策略独立实现
- `base-strategy.ts`: 定义策略接口和通用逻辑
- 策略优先级: add-fallback > prune-noise > append-context > tighten-trigger > rewrite-section

#### skill-evolution/
- `thread.ts`: 管理单个 Skill 的演化生命周期
  - 触发条件: 10 轮对话 或 Skill 重新调用
  - 状态管理: collecting → analyzing → idle
- `manager.ts`: 管理多个 Skill 的演化线程

### 2.5 守护进程 (src/daemon/)

**职责**: 后台运行模式

```
src/daemon/
└── index.ts                  # Daemon 实现
```

### 2.6 LLM 层 (src/llm/)

**职责**: LLM 客户端和令牌追踪

```
src/llm/
├── factory.ts                # LLM 工厂
├── litellm-client.ts         # LiteLLM 客户端
└── token-tracker.ts          # 令牌使用追踪
```

**关键文件**:
- `factory.ts`: 根据 provider 创建对应的 LLM 客户端
- **注意**: 部分 provider 尚未完全实现

### 2.7 存储层 (src/storage/)

**职责**: 数据持久化

```
src/storage/
├── index.ts                  # 存储入口
├── markdown.ts               # Markdown 文件操作
├── ndjson.ts                 # NDJSON 文件操作
└── sqlite.ts                 # SQLite 数据库操作
```

**存储策略**:
- SQLite: 结构化数据（sessions, mappings, metadata）
- NDJSON: 追加式日志数据（traces, journal）
- Markdown: Skill 内容存储

### 2.8 类型定义 (src/types/)

**职责**: 全局 TypeScript 类型

```
src/types/
└── index.ts                  # 所有类型定义
```

**核心类型**:
- `Trace`: Trace 数据结构
- `ProjectSkillShadow`: Shadow Skill 定义
- `EvolutionRecord`: 演化记录
- `EvaluationResult`: 评估结果
- `ChangeType`: 变更类型枚举

### 2.9 工具函数 (src/utils/)

**职责**: 通用工具函数

```
src/utils/
├── api-key-validator.ts      # API Key 验证
├── diff.ts                   # 差异计算
├── error-helper.ts           # 错误处理
├── hash.ts                   # 哈希计算
├── index.ts                  # 工具入口
├── interactive-selector.ts   # 交互式选择器
├── logger.ts                 # 日志系统
├── path.ts                   # 路径处理
├── skill-refs.ts             # Skill 引用提取
└── status-bar.ts             # 状态栏显示
```

---

## 3. 文档目录 (docs/)

```
docs/
├── AGENT-MIGRATION-PLAN.md   # Agent 迁移计划
├── ARCHITECTURE_CONSTRAINTS.md # 架构约束（必读）
├── CLAUDE-OPENCODE-TRACE-RESEARCH.md # Claude/OpenCode Trace 研究
├── CODEX-TRACE-RESEARCH.md   # Codex Trace 研究
├── DESIGN.md                 # 完整设计文档（必读）
├── ENGINEERING_PLAN.md       # 工程计划
├── LITELLM-RESEARCH.md       # LiteLLM 调研
├── PRD.md                    # 产品需求文档
├── PROGRESS.md               # 进度跟踪
├── SESSION-STORAGE-RESEARCH.md # Session 存储调研
└── TRACE-SKILL-MAPPING.md    # Trace-Skill 映射文档
```

---

## 4. 测试目录

### 4.1 实验测试 (test/)

```
test/
├── fixtures/                 # 测试数据
│   ├── claude/               # Claude traces
│   ├── codex/                # Codex traces
│   ├── skills/               # 测试 skills
│   └── test-project/         # 测试项目结构
├── pipeline/                 # Pipeline 测试
├── LLM-SKILL-ANALYSIS-REPORT.md
└── ... various test scripts
```

### 4.2 正式测试 (tests/)

```
tests/
├── agent-poc/                # Agent POC 测试
│   ├── test-evaluator-agent.ts
│   ├── test-patch-generator.ts
│   └── ...
└── unit/                     # 单元测试
    ├── config.test.ts
    ├── skill-evolution.test.ts
    ├── trace-router.test.ts
    └── ...
```

---

## 5. 运行时数据目录 (.ornn/)

**说明**: 此目录在运行时生成，不包含在版本控制中

```
.ornn/
├── config/
│   └── settings.toml         # 项目级配置
├── skills/                   # Shadow Skills
│   └── {skill-id}/
│       ├── current.md        # 当前版本内容
│       ├── meta.json         # 元数据
│       ├── journal.ndjson    # 演化日志
│       └── snapshots/        # 历史快照
│           ├── rev_0001.md
│           └── rev_0002.md
└── state/
    ├── daemon.pid            # Daemon 进程 ID
    ├── sessions.db           # SQLite 数据库
    ├── default.ndjson        # Traces 数据
    └── default.ndjson.lock   # 文件锁
```

---

## 6. 目录职责边界

| 目录 | 职责 | 注意 |
|------|------|------|
| `src/cli/` | 用户交互 | 只处理命令解析，业务逻辑在 core |
| `src/core/` | 业务逻辑 | 纯逻辑，无 UI |
| `src/llm/` | LLM 通信 | 统一接口，支持多 provider |
| `src/storage/` | 数据持久化 | 屏蔽底层存储细节 |
| `src/types/` | 类型定义 | 所有模块共享 |
| `src/utils/` | 通用工具 | 无业务逻辑 |
| `docs/` | 设计文档 | 与实现保持同步 |
| `test/` | 实验代码 | 不保证稳定性 |
| `tests/` | 正式测试 | 可重复执行 |

---

*此文档由 summary-my-repo 技能自动生成*
