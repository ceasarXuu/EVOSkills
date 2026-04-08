# 目录职责图

## 顶层目录

```text
.
├── src/                 # 真正的一手实现
├── tests/               # 当前主测试集（unit + agent-poc）
├── test/                # 早期实验、分析报告、旧测试资产
├── docs/                # PRD、设计、研究、进度文档
├── dist/                # 已构建产物
├── coverage/            # 覆盖率输出
├── .github/             # CI 工作流
├── .codex/.claude/.opencode/  # 项目内各 runtime skill 目录
├── .ornn/               # 项目级运行态数据与 shadow 状态
├── show-my-repo/        # 另一类 repo 总结产物
└── summary-my-repo/     # 本技能生成的内部总结产物
```

## `src/` 责任边界

### `src/cli/`

- 责任: CLI 命令注册、daemon 前台/后台启动、dashboard 启动、格式化输出。
- 为什么重要: 这是所有用户路径的统一入口，能快速判断功能是否“对外可达”。
- 重点文件:
  - `src/cli/index.ts`: 命令总装配，决定哪些功能被公开。
  - `src/cli/commands/daemon.ts`: daemon 生命周期、PID、dashboard 联动。
  - `src/cli/lib/daemon-helpers.ts`: 进程状态与 pid/log 相关辅助。

### `src/commands/`

- 责任: 顶层业务命令实现。
- 当前角色: 这里只有 `init.ts`，说明初始化逻辑被有意与 CLI 壳层拆开。

### `src/config/`

- 责任: 全局与项目配置加载、默认值、provider/LLM catalog、配置向 dashboard 暴露。
- 边界: 只负责“配置是什么”和“如何校验/读写”，不直接做优化闭环。

### `src/core/`

- 责任: 系统核心行为。
- 子域边界:
  - `observer/`: trace 采集、trace buffer、按 skill 聚合。
  - `trace-skill-mapper/`: trace -> skill 的归因逻辑。
  - `evaluator/`: 判断是否需要 patch。
  - `patch-generator/`: 按 change type 生成具体 patch。
  - `shadow-manager/`: 闭环编排者，串联 trace、evaluation、patch、journal、registry。
  - `shadow-registry/`: shadow 文件与索引管理。
  - `skill-version/` / `journal/`: 演化历史与版本材料。
  - `skill-deployer/`: 把版本化内容回写到 runtime skill 目录。
  - `router/` / `analyzer/`: 偏向 LLM 驱动路线的模块，体现产品演化方向，但不是当前最短理解路径。
  - `phase2/4/5-integration.ts`: 阶段性整合文件，说明仓库经历过分阶段搭建。

### `src/daemon/`

- 责任: 后台运行时壳层。
- 边界: 管观察者接入、重试队列、清理任务、checkpoint、优雅退出，不负责 patch 细节。

### `src/dashboard/`

- 责任: 提供内置 HTTP + SSE dashboard、多项目视图、项目状态快照读取。
- 边界: 读状态并展示，不是优化主链路的一部分。

### `src/llm/`

- 责任: provider client、token 跟踪、LiteLLM 适配。
- 现状判断: 是系统向 LLM 分析路线扩展的基础设施。

### `src/storage/`

- 责任: SQLite、NDJSON、Markdown 三种存储抽象。
- 设计意图:
  - SQLite 用于结构化索引和关联查询。
  - NDJSON 用于 trace/journal 追加写。
  - Markdown 用于 skill 正文本体。

### `src/types/`

- 责任: 全局类型模型。
- 价值: 是理解 shadow、trace、evaluation、runtime 这些概念边界的最低成本入口。

### `src/utils/`

- 责任: logger、path、hash、parse、timeout、CLI formatter 等横切基础设施。
- 特征: 这里的工具函数被核心模块高度复用，是跨子域耦合的集中点。

## `tests/` 与 `test/` 的区别

### `tests/`

- `implemented`: 当前主测试集，匹配 `package.json` 的 `vitest` 与 `tests/agent-poc/*` 脚本。
- 重点:
  - `tests/unit/`: 大量核心模块单测，覆盖 mapper、registry、journal、pipeline、dashboard、config 等。
  - `tests/agent-poc/`: 更接近真实模型/配置验证的实验入口。

### `test/`

- `inferred`: 更偏历史实验区、分析稿和旧 pipeline 试验，不是当前 CI 主入口。
- 风险: 新人容易把这里当成正式测试目录。

## 运行态与源码目录的关系

### `.ornn/`

- 项目级运行状态目录。
- 存放 shadow、副本版本、数据库、状态、配置。
- 理解方式: 这是 OrnnSkills 自己的工作数据区，不属于产品源码实现本身。

### `.codex/` / `.claude/` / `.opencode/`

- 项目内 runtime skill 生效目录。
- deployer 最终把版本化内容写回这里。

## 文档目录 `docs/`

- `README.md`: 用户入口。
- `docs/DESIGN.md`: 系统设计理想态。
- `docs/PROGRESS.md`: 阶段进度记录，但已落后于源码。
- `docs/*RESEARCH*.md`: trace、storage、LiteLLM 等专项研究材料。

## 新人读目录时要遵守的判断原则

- 先信 `src/`，再信 `docs/`。
- 先看 `tests/`，再看 `test/`。
- `dist/` 是结果，不是事实来源。
- `.ornn/` 和 runtime 目录是运行态，不要误当核心实现。
