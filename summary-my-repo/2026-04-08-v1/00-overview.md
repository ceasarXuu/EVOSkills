# OrnnSkills 仓库总览

## 1. 仓库目的与当前成熟度

**项目名**: `ornn-skills`

**一句话定位**: 一个项目级 Skill 演化代理。它在后台监听 Agent 运行轨迹，把 trace 映射到 skill，评估是否应该优化，再把变更写入项目内 shadow skill 与版本记录，并可部署回运行时目录。

**当前成熟度判断**

- `implemented`: TypeScript CLI、daemon、trace 采集与映射、shadow registry、journal/version、dashboard、SQLite/NDJSON 存储、测试与 CI 都已经落地。
- `implemented`: 代码已经超出 `docs/PROGRESS.md` 中“仅完成 Phase 1”的描述，说明进度文档明显滞后于真实实现。
- `inferred`: 当前系统核心执行路径已经可跑通，但还有“新架构”和“旧设计文档”并存的状态，目录中存在 phase integration、router/analyzer、dashboard、agent-poc 等多条演进轨迹。
- `planned`: `docs/DESIGN.md` 仍描述 LLM Router / Skill Evolution Thread / Analyzer 驱动的主架构；代码里这些方向有模块雏形，但当前主闭环更偏“规则评估 + patch strategy + shadow manager”。
- `risk`: 设计文档、进度文档、README、源码实际行为之间存在偏差，新成员如果只看文档会对当前系统边界形成错误认知。

## 2. 架构快照

当前代码支持的主流程可以压缩为：

1. CLI 通过 `commander` 暴露 `init`、`start/stop/restart`、`skills *`、`config`、`dashboard` 等命令，作为项目入口。参见 `S01`。
2. `ornn start` 启动 `Daemon`，先初始化 `ShadowManager`，再挂接 `CodexObserver` trace 回调，最后开启文件监听、清理任务与 checkpoint。参见 `S02`。
3. `ShadowManager` 启动时会扫描项目内和全局 skill 根目录，按 runtime 维度选择来源，创建或同步 shadow skill，并把 origin/shadow 元数据写入数据库。参见 `S03`、`S04`。
4. 新 trace 到来后，`TraceSkillMapper` 用 6 条策略做 skill 归因，包括读 skill 文件、工具调用、文件修改、metadata、assistant output、user input。参见 `S05`、`S06`。
5. `OptimizationPipeline` 或 `ShadowManager.processTrace` 对 trace 分组后交给 evaluator；只有当 shadow 存在、未冻结且评估置信度足够时才生成优化任务。参见 `S07`、`S08`。
6. `ShadowManager.executePatch` 调用 patch generator 生成新内容，把变更写回 shadow 文件并记录 journal / revision / snapshot。参见 `S09`。
7. `SkillDeployer` 负责把版本化 skill 写回 `.codex/.claude/.opencode` 的目标目录，并注入版本头；SQLite 层用原子写入保护状态文件。参见 `S10`、`S11`。

## 3. 关键工作流

### 3.1 项目初始化

- `implemented`: `initCommand()` 创建 `.ornn/{skills,state,config}`，并尝试把项目注册进 dashboard registry。
- `coupling`: `init` 很轻，只建壳，不做 skill bootstrap；真正的 skill 发现发生在 daemon / shadow manager 初始化阶段。

### 3.2 运行时观察与优化闭环

- `implemented`: daemon 的启动顺序是 `shadowManager.init()` -> `codexObserver.onTrace()` -> `codexObserver.start()` -> watcher/cleanup/checkpoint。
- `implemented`: trace 先映射到 skill，再按 session 或 recent traces 做 evaluator 判断。
- `implemented`: patch 应用前还有三层闸门: cooldown、daily patch limit、frozen 状态。
- `inferred`: 当前系统把“是否优化”更多交给规则引擎而不是 LLM analyzer 主导，说明仓库处于设计迭代后的中间形态。

### 3.3 状态持久化与部署

- `implemented`: `.ornn/shadows/` 持有项目内 shadow 副本；SQLite 保存 origin/shadow/mapping/session 等索引；journal/version 管理演化历史。
- `implemented`: 部署写回 runtime 目录时会注入版本头，保留来源项目、runtime、优化原因等元信息。
- `risk`: skill 正文与 shadow index、SQLite、version/journal 是分层持久化，排查问题时必须跨文件系统和数据库联合看，单看某一层会丢上下文。

## 4. 关键不变量与耦合点

- `implemented`: runtime 是一等维度。很多 key 被编码成 `runtime::skillId` 或 shadow id，跨 runtime 不能直接混用。
- `implemented`: 项目内来源优先于全局来源。`ShadowManager.bootstrapSkillsForMonitoring()` 会先选项目 skill，再回落全局 skill。
- `implemented`: patch 并不直接改全局 skill，而是先写 shadow，再由 deployer 写回项目 runtime 目录。
- `risk`: README 说支持 Codex/OpenCode/Claude，但 daemon 当前直接实例化的是 `createCodexObserver()`；多 runtime 支持更多体现在数据结构和部署路径上，而不是单一 daemon 主入口已经完全打通。
- `risk`: `docs/PROGRESS.md` 仍把多个核心模块标为未实现，这与源码冲突，说明文档治理滞后。

## 5. 风险、缺口与容易误读的地方

- `risk`: 存在 `src/core/router`、`src/core/analyzer`、`phase*-integration` 等模块，容易让人误判当前主线是 LLM 驱动路由；但实际落地主链路仍是 observer/mapper/evaluator/patch/shadow。
- `risk`: `dist/` 已提交，说明仓库同时承载源码与构建产物；排查 bug 时要明确是读 `src/` 还是 `dist/`。
- `risk`: 目录里同时有 `test/` 和 `tests/`。前者更像历史实验与分析产物，后者才是当前 Vitest/agent-poc 主测试集。
- `risk`: `.ornn/`、`.codex/`、`.claude/`、`.opencode/` 都可能出现在仓库内，项目态数据和源码混放，新成员需要先区分“产品代码”和“运行产物”。

## 6. 推荐阅读顺序

1. `README.md`
2. `src/cli/index.ts`
3. `src/daemon/index.ts`
4. `src/core/shadow-manager/index.ts`
5. `src/core/trace-skill-mapper/index.ts`
6. `src/core/pipeline/index.ts`
7. `src/core/patch-generator/index.ts`
8. `src/core/skill-deployer/index.ts`
9. `src/storage/sqlite.ts`
10. `tests/unit/trace-skill-mapper.test.ts` 与 `tests/unit/shadow-manager.test.ts`

## 7. 本总结包覆盖说明

- 目录职责: 已覆盖
- 主控制流: 已覆盖
- 核心持久化路径: 已覆盖
- 实现 / 推断 / 计划 / 风险分层: 已覆盖
- 代码证据: 见 `03-code-evidence.md`
