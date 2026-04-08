# 核心逻辑走读

## 1. CLI 如何把系统能力公开出来

`src/cli/index.ts` 是最短入口。它把初始化、daemon、skills 子命令、logs、config、dashboard 全挂到 `ornn` 程序上，因此这里能快速看出哪些能力已经产品化，而不是停留在内部模块。证据见 `S01`。

关键理解:

1. `init` 走 `src/commands/init.ts`，只负责项目态初始化。
2. `skills` 子命令族说明 shadow 生命周期管理是正式用户能力。
3. `start/stop/restart` 与 `daemon` 同时存在，说明仓库既支持简化入口，也保留完整子命令树。

## 2. Daemon 是实际运行时编排壳层

`Daemon.start()` 的控制流很明确，证据见 `S02`:

1. 初始化 `ShadowManager`，确保 shadow / registry / db 等依赖齐备。
2. 把 observer 的 trace 回调接到 `processTraceWithRetry()`。
3. 启动 observer。
4. 启动文件 watcher、定时清理、重试队列处理和 checkpoint。
5. 更新 dashboard 注册信息，并安装优雅退出处理。

这说明 daemon 的职责不是“思考如何优化”，而是保证后台循环可靠运行。

## 3. 系统先做 skill bootstrap，再开始观察

`ShadowManager.init()` 后马上执行 `bootstrapSkillsForMonitoring()`。这一段很关键，因为它决定“哪些 skill 会被系统监控”，证据见 `S03`、`S04`。

实际行为:

1. 同时扫描项目内与全局 skill 根目录。
2. 按 runtime 粒度做决议，同名 skill 时优先选项目来源。
3. 为每个 runtime-skill 组合创建或同步 shadow。
4. 把 shadow 元数据写入 SQLite。
5. 把 origin/shadow 注册给 mapper。
6. 如果来源是全局 skill 且项目内不存在，就物化一份到项目目录。

这一步解释了 OrnnSkills 的一个核心产品承诺: 项目隔离优先于全局共享。

## 4. Trace 到 Skill 的归因是多策略，不依赖单一路径

`TraceSkillMapper.mapTrace()` 实现了当前系统最核心的判定逻辑之一。证据见 `S05`、`S06`。

已实现的策略:

1. `read_file` 直接读取 skill 文件，置信度 0.95。
2. 一般 `tool_call` 中推断 skill，置信度 0.85。
3. 修改了 skill 文件，置信度 0.9。
4. trace metadata 明示 skill id，置信度 0.98。
5. assistant output 提到 skill，置信度 0.6。
6. user input 请求某 skill，置信度 0.5。

这里的设计含义:

- 系统并不要求所有 runtime 都提供结构化 skill id。
- 归因置信度是后续优化闸门的一部分，而不是单纯调试信息。
- 低置信度策略也被保留，说明作者接受“先覆盖、再筛选”的召回思路。

## 5. Pipeline 负责批量评估，ShadowManager 负责即时闭环

仓库里有两种相近但不完全相同的编排方式:

### `OptimizationPipeline`

证据见 `S07`、`S08`。它更像批处理控制器:

1. 取最近 100 条 trace。
2. map and group。
3. 逐组评估。
4. 只在 shadow 存在、未冻结、评估结果要求 patch 且置信度足够时产出优化任务。

### `ShadowManager.processTrace()`

证据见 `S09`。它更像实时闭环:

1. 记录 trace。
2. 直接找对应 shadow。
3. 拉取当前 session traces。
4. 立即跑 evaluator。
5. 命中后执行 patch。

`inferred`: 这两个路径并存，说明代码既在支持后台批处理，也在保留更直接的“trace 到 patch”路径。真实生产主线更接近 `ShadowManager`，而 `OptimizationPipeline` 更像后续可独立调度的编排器。

## 6. Patch 落地前有三层保护，落地后会写演化历史

`ShadowManager.handleEvaluation()` 与 `executePatch()` 体现了系统的“保守自动化”约束，证据见 `S09`。

执行条件:

1. 不在 cooldown 内。
2. 没超过每日 patch 限额。
3. shadow 未冻结。
4. evaluator 置信度高于 policy 阈值。

执行结果:

1. 读取当前 shadow 内容。
2. 交给 patch generator 按 change type 生成新内容。
3. 写回 shadow。
4. journal 记录 before/after hash、reason、patch 内容、source sessions。
5. 满足条件时创建 snapshot。

这解释了为什么仓库里同时有 shadow、journal、version、runtime 目录: 它不是冗余，而是不同层级的可回滚材料。

## 7. 部署与存储层保证“可追踪”

### 部署

`SkillDeployer` 不只是简单复制文件，它会注入版本头，记录版本号、来源项目、runtime、最后优化时间和原因。证据见 `S10`。

### 存储

`SQLiteStorage.save()` 使用唯一临时文件 + rename 做原子替换，降低并发保存造成损坏的概率。证据见 `S11`。

这两层组合在一起意味着:

- 运行时看到的 skill 文件本身带追踪元信息。
- 后台状态数据库尽量避免部分写入。

## 8. 需要特别注意的“实现 vs 文档”偏差

- `implemented`: 代码里已经有 dashboard、多 runtime 路径、pipeline、patch generator、大量单测。
- `planned`: `docs/DESIGN.md` 仍把 Router/Analyzer 作为更中心的故事线。
- `risk`: `docs/PROGRESS.md` 仍停留在“Phase 1 已完成、后续未开始”的状态。

因此，新成员如果要回答“当前系统实际上怎么工作”，必须优先依据 `S01-S11` 这组代码证据，而不是设计稿。
