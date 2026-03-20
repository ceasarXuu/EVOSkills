# OrnnSkills 用户使用指南

## 什么是 OrnnSkills？

OrnnSkills 是一个后台运行的智能助手，它会自动观察你使用 AI Agent（比如 Codex、OpenCode、Claude）的过程，然后帮你优化你的 skill 文件。

简单来说：
- 你正常使用 AI Agent 干活
- OrnnSkills 在后台默默观察
- 它发现你经常手动补充某些步骤，就会自动把这些步骤加到你的 skill 里
- 下次遇到类似情况，AI Agent 就能自动完成，不用你再手动补充了

---

## 安装

```bash
npm install -g ornn-skills
```

---

## 快速开始

### 1. 查看当前项目有哪些 shadow skills

```bash
ornn skills status
```

输出示例：
```
Shadow Skills in /path/to/project:

Skill ID                Status      Revision  Last Optimized
──────────────────────────────────────────────────────────────
coding-standards        active      3         2026-03-15
api-design              active      1         Never
testing                 frozen      5         2026-03-10
```

### 2. 查看某个 skill 的详细状态

```bash
ornn skills status --skill coding-standards
```

输出示例：
```
Shadow Skill: coding-standards
Status: active
Current Revision: 3
Created: 2026-03-01T10:00:00Z
Last Optimized: 2026-03-15T14:30:00Z
Snapshots: 2

Recent Snapshots:
  rev_0001 - 2026-03-01T10:00:00Z
  rev_0003 - 2026-03-15T14:30:00Z
```

---

## 常用命令详解

### 查看演化日志

看看这个 skill 被自动优化了多少次，每次改了什么。

```bash
# 查看最近 20 条记录
ornn skills log coding-standards

# 只看最近 5 条
ornn skills log coding-standards --limit 5

# 只看"添加 fallback"类型的修改
ornn skills log coding-standards --type add_fallback
```

输出示例：
```
Evolution log for "coding-standards":

🤖 rev_0003 - 2026/3/15 14:30:00
   Type: ADD_FALLBACK
   Reason: User manually supplemented "run linter" in 3 sessions after agent output
   Sessions: 3

👤 rev_0002 - 2026/3/10 09:15:00
   Type: PRUNE_NOISE
   Reason: Removed redundant section that was always skipped
   Sessions: 5

🤖 rev_0001 - 2026/3/5 16:45:00
   Type: APPEND_CONTEXT
   Reason: Added project-specific context for TypeScript projects
   Sessions: 2
```

说明：
- 🤖 表示自动优化
- 👤 表示手动修改
- Sessions 表示有多少个对话 session 参与了这次优化

---

### 查看 diff（对比差异）

看看当前的 shadow skill 和原始版本有什么不同。

```bash
# 与原始 origin skill 对比
ornn skills diff coding-standards --origin

# 与某个历史版本对比
ornn skills diff coding-standards --revision 1
```

输出示例：
```
Diff between origin and shadow for "coding-standards":

--- origin/coding-standards
+++ shadow/coding-standards
@@ -10,6 +10,10 @@
 ## Steps
 1. Write the code
 2. Run tests
+3. Run linter
+4. Check for type errors
+
+## Fallback
+- If linter fails, fix the issues and retry
```

---

### 回滚到之前的版本

如果某次自动优化改坏了，可以回滚到之前的版本。

```bash
# 先看看有哪些可用的版本
ornn skills rollback coding-standards

# 回滚到第 2 个版本
ornn skills rollback coding-standards --to 2

# 回滚到最新的快照
ornn skills rollback coding-standards --snapshot

# 回滚到最初的版本（从 origin 复制过来的样子）
ornn skills rollback coding-standards --initial
```

输出示例：
```
Available snapshots for "coding-standards":

  rev_0001 - 2026-03-01T10:00:00Z
  rev_0003 - 2026-03-15T14:30:00Z

Usage:
  ornn skills rollback coding-standards --to <revision>
  ornn skills rollback coding-standards --snapshot
  ornn skills rollback coding-standards --initial
```

---

### 冻结/解冻自动优化

有时候你不想让某个 skill 被自动修改，可以冻结它。

```bash
# 冻结（暂停自动优化）
ornn skills freeze coding-standards

# 解冻（恢复自动优化）
ornn skills unfreeze coding-standards
```

冻结后：
- OrnnSkills 不会再自动修改这个 skill
- 但你仍然可以在 AI Agent 中使用它
- 状态会显示为 `frozen`

---

## 工作原理

### Shadow Skill 是什么？

当你在一个项目中首次使用某个全局 skill 时，OrnnSkills 会自动在这个项目里创建一个"影子副本"（shadow skill）。

```
全局 skill: ~/.skills/coding-standards.md
    ↓ 首次使用
项目 shadow: your-project/.ornn/skills/coding-standards/current.md
```

之后，OrnnSkills 会：
- 观察你在这个项目中如何使用这个 skill
- 基于观察到的模式自动优化 shadow skill
- 原始的全局 skill 不会被修改

### Trace-Skill 映射

OrnnSkills 的核心功能是将 AI Agent 的执行 trace 映射到对应的 skill。系统使用 6 种策略进行映射：

1. **文件读取检测** (置信度 0.95)
   - 当 AI 读取 skill 文件时，直接映射到该 skill
   - 例如：`read_file` 操作读取 `~/.skills/my-skill/current.md`

2. **工具调用推断** (置信度 0.85)
   - 从工具参数中推断 skill 信息
   - 例如：执行命令中包含 skill 名称

3. **文件变化检测** (置信度 0.9)
   - 当 skill 文件被修改时，映射到该 skill
   - 例如：编辑 `.ornn/skills/coding-standards/current.md`

4. **元数据标识** (置信度 0.98)
   - trace 中显式包含 skill_id 元数据
   - 最可靠的映射方式

5. **输出内容推断** (置信度 0.6)
   - 从 AI 输出中识别 skill 引用
   - 例如：输出中提到 "according to coding-standards"

6. **用户输入推断** (置信度 0.5)
   - 从用户输入中识别 skill 请求
   - 例如：用户说 "use coding-standards"

### 自动优化闭环

系统实现了完整的自动优化闭环：

```
1. Trace 采集
   ↓
2. Trace-Skill 映射
   ↓
3. 模式分析与评估
   ↓
4. 生成优化任务
   ↓
5. 应用补丁到 shadow skill
   ↓
6. 记录演化日志
```

**示例场景**：

假设你经常在使用 `coding-standards` skill 后手动补充 "run linter" 步骤：

1. **采集**: OrnnSkills 采集到多个 trace，其中包含你手动补充 "run linter" 的操作
2. **映射**: 这些 trace 被映射到 `coding-standards` skill
3. **评估**: 系统发现你在 3 个不同 session 中都手动补充了这个步骤
4. **生成**: 系统生成一个 `add_fallback` 类型的优化任务
5. **执行**: 系统自动在 shadow skill 中添加 "run linter" 步骤
6. **记录**: 保存演化日志，记录这次优化

之后，当你再次使用这个 skill 时，AI Agent 会自动包含 "run linter" 步骤，无需你手动补充。

### 自动优化的类型

OrnnSkills 支持以下几种自动优化：

1. **add_fallback** - 添加 fallback 说明
   - 当你经常在 AI 输出后手动补充某个步骤时
   - 系统会自动把这个步骤加到 skill 里

2. **prune_noise** - 删除冗余内容
   - 当某个 section 经常被跳过时
   - 系统会自动删除它

3. **append_context** - 补充项目上下文
   - 当发现项目有特殊需求时
   - 系统会自动补充相关说明

4. **tighten_trigger** - 收紧触发条件
   - 当 skill 在不该触发的时候被触发时
   - 系统会自动调整触发条件

### 自动优化的限制

为了安全，自动优化有以下限制：

- 每个 skill 每天最多优化 3 次
- 两次优化之间至少间隔 24 小时
- 只允许小步修改，不会大幅重写
- 不会修改全局的 origin skill
- 所有修改都可以回滚
- 低于 50% 置信度的 trace 不会被用于优化

---

## 项目目录结构

使用 OrnnSkills 后，你的项目会多出一个 `.ornn` 目录：

```
your-project/
├── .ornn/
│   ├── skills/
│   │   └── coding-standards/
│   │       ├── current.md      # 当前生效的 shadow skill
│   │       ├── meta.json       # 元数据
│   │       ├── journal.ndjson  # 演化日志
│   │       └── snapshots/      # 快照
│   │           ├── rev_0001.md
│   │           └── rev_0003.md
│   ├── state/
│   │   ├── sessions.db         # SQLite 数据库
│   │   └── traces.ndjson       # 执行轨迹
│   └── config/
│       └── settings.toml       # 项目配置（可选）
└── ...你的其他文件
```

---

## 配置

### 全局配置

配置文件位置：`~/.ornn/settings.toml`

```toml
[origin_paths]
paths = ["~/.skills", "~/.claude/skills"]

[observer]
enabled_runtimes = ["codex", "opencode", "claude"]
trace_retention_days = 30
buffer_size = 10            # 缓冲区大小
flush_interval = 5000       # 定时刷新间隔（毫秒）

[evaluator]
min_signal_count = 3        # 至少出现 3 次信号才触发优化
min_source_sessions = 2     # 至少来自 2 个不同的 session
min_confidence = 0.7        # 置信度至少 70%

[mapper]
min_confidence = 0.5        # trace 映射的最低置信度阈值
persist_mappings = true     # 是否保存映射关系到数据库

[pipeline]
auto_optimize = true        # 是否启用自动优化
min_confidence = 0.7        # 优化任务的最低置信度

[patch]
allowed_types = ["append_context", "add_fallback", "prune_noise"]
cooldown_hours = 24         # 两次优化间隔至少 24 小时
max_patches_per_day = 3     # 每天最多优化 3 次
```

### 项目配置

在项目的 `.ornn/config/settings.toml` 中可以覆盖全局配置：

```toml
[project]
name = "my-project"
auto_optimize = true

[skills.coding-standards]
auto_optimize = false  # 冻结这个 skill

[skills.api-design]
allowed_patch_types = ["append_context"]  # 只允许补充上下文

[mapper]
min_confidence = 0.6  # 项目特定的映射置信度阈值
```

### 配置说明

#### Mapper 配置

- `min_confidence`: trace 映射的最低置信度阈值。低于此值的 trace 不会被映射到 skill。
  - 建议值：0.5（默认）
  - 更高的值会减少误报，但可能漏掉一些有效的映射

- `persist_mappings`: 是否将映射关系保存到数据库
  - 默认值：true
  - 设为 false 可以节省存储空间，但会丢失映射历史

#### Observer 配置

- `buffer_size`: 缓冲区大小，达到此数量时触发刷新
  - 建议值：10（默认）
  - 更小的值会更快触发评估，但可能增加处理开销

- `flush_interval`: 定时刷新间隔（毫秒）
  - 默认值：5000（5 秒）
  - 更小的值会更快响应，但可能增加 CPU 使用

#### Pipeline 配置

- `auto_optimize`: 是否启用自动优化
  - 默认值：true
  - 设为 false 可以禁用自动优化，只进行 trace 采集和映射

- `min_confidence`: 优化任务的最低置信度
  - 默认值：0.7
  - 更高的值会减少误优化，但可能错过一些有价值的优化机会

---

## 常见问题

### Q: 我的 skill 被改坏了怎么办？

A: 使用回滚命令：

```bash
# 先看看有哪些版本
ornn skills rollback <skill-id>

# 回滚到之前的好版本
ornn skills rollback <skill-id> --to <revision>
```

### Q: 我不想让某个 skill 被自动修改

A: 冻结它：

```bash
ornn skills freeze <skill-id>
```

### Q: 怎么看 OrnnSkills 对我的 skill 做了什么？

A: 查看演化日志：

```bash
ornn skills log <skill-id>
```

### Q: 自动优化太频繁了怎么办？

A: 修改配置文件 `~/.ornn/settings.toml`：

```toml
[patch]
cooldown_hours = 48         # 增加冷却时间到 48 小时
max_patches_per_day = 1     # 每天最多优化 1 次
```

### Q: 我可以手动触发优化吗？

A: 目前只能通过 CLI 查看状态和回滚，自动优化是在后台进行的。如果需要手动优化，可以直接编辑 `.ornn/skills/<skill-id>/current.md` 文件。

### Q: Shadow skill 和原始 skill 有什么关系？

A: Shadow skill 是从原始 skill 复制过来的，然后被自动优化。原始 skill 不会被修改。如果你想把 shadow skill 的优化同步回原始 skill，需要手动操作。

### Q: Trace-Skill 映射是什么？为什么我的 trace 没有被映射到 skill？

A: Trace-Skill 映射是系统将 AI Agent 的执行 trace 识别并关联到对应 skill 的过程。如果你的 trace 没有被映射，可能是因为：

1. **置信度太低**: trace 的映射置信度低于配置的阈值（默认 0.5）
2. **skill 未注册**: 系统不知道这个 skill
3. **trace 不包含 skill 信息**: trace 中没有明确指向任何 skill 的信息

解决方法：
- 检查 `~/.ornn/settings.toml` 中的 `mapper.min_confidence` 设置
- 确保 skill 文件在正确的路径下（`.skills/`、`.claude/skills/`、`.ornn/skills/`）
- 查看演化日志了解映射详情

### Q: 如何查看 trace 映射的统计信息？

A: 目前可以通过 API 获取映射统计，CLI 命令尚未实现。你可以使用以下代码：

```typescript
import { createTraceSkillMapper } from 'ornn-skills';

const mapper = createTraceSkillMapper('/path/to/project');
await mapper.init();

const stats = await mapper.getMappingStats();
console.log(stats);
// 输出: { total_mappings: 100, by_skill: { 'my-skill': 50 }, avg_confidence: 0.85 }
```

### Q: 自动优化的触发条件是什么？

A: 自动优化需要满足以下条件：

1. **trace 数量**: 至少有 `evaluator.min_signal_count`（默认 3）个相关 trace
2. **session 来源**: 至少来自 `evaluator.min_source_sessions`（默认 2）个不同的 session
3. **置信度**: 评估结果的置信度至少为 `evaluator.min_confidence`（默认 0.7）
4. **skill 状态**: skill 未被冻结（`status !== 'frozen'`）
5. **冷却时间**: 距离上次优化至少 `patch.cooldown_hours`（默认 24）小时
6. **每日限制**: 当天优化次数未超过 `patch.max_patches_per_day`（默认 3）

### Q: 如何禁用自动优化但保留 trace 采集？

A: 在配置文件中设置：

```toml
[pipeline]
auto_optimize = false  # 禁用自动优化
```

这样系统仍会采集和映射 trace，但不会自动执行优化。你可以手动检查演化日志，决定是否手动应用优化。

---

## 最佳实践

1. **先观察，再调整**
   - 让 OrnnSkills 运行一段时间，观察它做了什么
   - 如果觉得优化合理，就保留
   - 如果觉得不合理，就回滚并冻结

2. **定期检查演化日志**
   - 每隔几天看看 `ornn skills log`
   - 了解 OrnnSkills 在做什么

3. **重要的 skill 考虑冻结**
   - 如果某个 skill 很重要，不希望被自动修改
   - 使用 `ornn skills freeze` 冻结它

4. **利用项目配置**
   - 不同项目可能需要不同的优化策略
   - 在项目配置中覆盖全局配置

---

## 技术支持

如有问题或建议，请提交 Issue：
https://github.com/ceasarXuu/OrnnSkills/issues

---

*最后更新：2026-03-21*
