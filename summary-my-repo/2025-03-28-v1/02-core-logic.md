# OrnnSkills - 核心逻辑详解

**生成日期**: 2025-03-28

---

## 1. 系统启动流程

### 1.1 首次初始化 (`ornn init`)

```
用户执行 ornn init
    │
    ▼
┌─────────────────┐
│ 检查 .ornn/ 目录 │ ──► 已存在 → 提示重新初始化或退出
└─────────────────┘
    │
    ▼ 不存在
┌─────────────────┐
│ 交互式配置向导   │ ──► 选择 LLM Provider
│ (config/wizard) │ ──► 输入 API Key
└─────────────────┘    ► 选择 Model
    │
    ▼
┌─────────────────┐
│ 创建目录结构    │ ──► .ornn/config/
│                 │ ──► .ornn/state/
│                 │ ──► .ornn/skills/
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 保存配置        │ ──► .ornn/config/settings.toml
│                 │ ──► 加密存储 API Key
└─────────────────┘
    │
    ▼
初始化完成
```

**关键代码**: [src/commands/init.ts](../../src/commands/init.ts)

---

## 2. Trace 采集流程

### 2.1 Observer 监听机制

```
ProjectObserver (project-observer.ts)
    │
    ├──► 监听 ~/.codex/sessions/**/*.jsonl
    │
    └──► 监听 ~/.claude/projects/{project-name}/**/*.jsonl
              │
              ▼
        ┌─────────────┐
        │ 文件变化事件 │
        └─────────────┘
              │
              ▼
        ┌─────────────┐
        │ 解析 JSONL  │ ──► 按行解析 JSON
        │             │ ──► 提取有效 trace 对象
        └─────────────┘
              │
              ▼
        ┌─────────────┐
        │ 格式标准化  │ ──► 转换为 PreprocessedTrace
        │             │ ──► 提取 skillRefs (如 [$skill])
        └─────────────┘
              │
              ▼
        ┌─────────────┐
        │ 项目过滤    │ ──► Codex: 检查 payload.cwd
        │             │ ──► Claude: 检查目录名匹配
        └─────────────┘
              │
              ▼
        TraceManager.saveTrace()
```

**架构约束**: Observer 层 **100% 保留原始数据**，不做任何语义分析、情感判断或意图识别。

**关键代码**: [src/core/observer/project-observer.ts](../../src/core/observer/project-observer.ts)

### 2.2 Trace 存储

```
TraceManager
    │
    ├──► SQLite (结构化数据)
    │      - sessions 表
    │      - traces 表
    │      - mappings 表
    │
    └──► NDJSON (追加式日志)
           - .ornn/state/default.ndjson
           - 每行一个 JSON 对象
```

---

## 3. Trace-Skill 映射流程

### 3.1 六层映射策略

```
TraceSkillMapper.mapAndGroupTraces(traces)
    │
    ▼
对于每个 trace:
    │
    ├──► Strategy 1: tool_call 读取 skill 文件?
    │      │ 检查: tool_name === "read_file" && path 包含 skill 路径
    │      │ 置信度: 0.95
    │      │
    ├──► Strategy 2: tool_call 执行 skill 相关操作?
    │      │ 检查: tool 参数中包含 skill 引用
    │      │ 置信度: 0.85
    │      │
    ├──► Strategy 3: file_change 修改 skill 文件?
    │      │ 检查: files_changed 包含 skill 路径
    │      │ 置信度: 0.90
    │      │
    ├──► Strategy 4: metadata 包含 skill_id?
    │      │ 检查: metadata.skill_id 存在
    │      │ 置信度: 0.98
    │      │
    ├──► Strategy 5: assistant_output 引用 skill?
    │      │ 检查: 输出内容包含 [$skill] 或 @skill
    │      │ 置信度: 0.60
    │      │
    └──► Strategy 6: user_input 请求 skill?
           │ 检查: 输入包含 [$skill] 或 @skill
           │ 置信度: 0.50
           │
           ▼
    选择最高置信度的映射
           │
           ▼
    按 skill_id 分组
           │
           ▼
    返回 SkillTracesGroup[]
```

**关键代码**: [src/core/trace-skill-mapper/index.ts](../../src/core/trace-skill-mapper/index.ts)

---

## 4. 优化 Pipeline 流程

### 4.1 Pipeline 执行循环

```
OptimizationPipeline.runOnce()
    │
    ▼
┌─────────────────────┐
│ Step 1: 获取 Traces  │ ──► TraceManager.getRecentTraces(100)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Step 2: 映射分组    │ ──► TraceSkillMapper.mapAndGroupTraces()
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Step 3: 评估每个    │ 对于每个 skill 分组:
│     Skill 分组      │
└─────────────────────┘    │
                           ▼
                    ┌─────────────┐
                    │ 检查 Shadow │ ──► 不存在? 跳过
                    │   是否存在  │ ──► 已冻结? 跳过
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Evaluator   │ ──► 分析 trace 模式
                    │  评估       │ ──► 识别优化信号
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ 检查置信度  │ ──► < minConfidence? 跳过
                    └─────────────┘
                           │
                           ▼
                    生成 OptimizationTask
                           │
                           ▼
                    添加到任务队列
```

**关键代码**: [src/core/pipeline/index.ts](../../src/core/pipeline/index.ts)

### 4.2 后台循环

```
Pipeline.startBackgroundLoop(intervalMs = 60000)
    │
    ▼
setInterval(() => {
    if (config.autoOptimize) {
        pipeline.runOnce()
    }
}, intervalMs)
```

---

## 5. Skill 演化生命周期

### 5.1 演化线程状态机

```
                    ┌─────────┐
         ┌─────────►│  idle   │◄────────┐
         │          │ (初始)  │         │
         │          └────┬────┘         │
         │               │ start()      │ stop()
         │               ▼              │
         │          ┌─────────┐         │
         │    ┌────►│collecting│────────┘
         │    │     │ (收集中) │
         │    │     └────┬────┘
         │    │          │ 触发条件满足
         │    │          ▼
         │    │     ┌─────────┐
         │    └─────│analyzing│
         │    submit│ (分析中)│
         │    完成  └────┬────┘
         │               │ markSubmitted()
         └───────────────┘
```

### 5.2 触发条件

```
SkillEvolutionThread.checkTriggers()
    │
    ├──► 条件 1: 轮数阈值
    │      检查: countUniqueTurns() >= 10
    │      说明: 累计 10 轮对话（5 用户 + 5 助手）
    │
    └──► 条件 2: 重新调用
           检查: invokeCount > submittedCount
           说明: Skill 被再次调用
```

**关键代码**: [src/core/skill-evolution/thread.ts](../../src/core/skill-evolution/thread.ts)

---

## 6. 评估器 (Evaluator) 逻辑

### 6.1 评估流程

```
evaluator.evaluate(traces)
    │
    ▼
┌─────────────────────┐
│ 应用评估规则        │
│                     │
│ ┌─────────────────┐ │
│ │ repeated-drift  │ │ ──► 检测重复模式漂移
│ │ (重复漂移检测)  │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ repeated-manual │ │ ──► 检测重复手动修复
│ │ -fix            │ │
│ └─────────────────┘ │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 汇总评估结果        │ ──► should_patch: boolean
│                     │ ──► change_type: ChangeType
│                     │ ──► confidence: number
└─────────────────────┘
```

**关键代码**: [src/core/evaluator/index.ts](../../src/core/evaluator/index.ts)

---

## 7. 补丁生成流程

### 7.1 策略选择

```
PatchGenerator.generate(changeType, currentContent, context)
    │
    ▼
┌─────────────────────┐
│ 查找对应策略        │ ──► 策略不存在? 返回错误
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 检查策略是否启用    │ ──► 已禁用? 返回错误
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 检查变更类型是否    │ ──► 不在 allowed_types? 返回错误
│ 在允许列表中        │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 执行策略            │ ──► 带超时控制 (默认 5s)
│                     │
│ 策略优先级:         │
│ 1. add-fallback     │ ──► 添加高频回退处理
│ 2. prune-noise      │ ──► 移除低价值描述
│ 3. append-context   │ ──► 补充项目特定上下文
│ 4. tighten-trigger  │ ──► 收紧适用条件
│ 5. rewrite-section  │ ──► 重写特定章节
└─────────────────────┘
    │
    ▼
返回 PatchResult
```

**关键代码**: [src/core/patch-generator/index.ts](../../src/core/patch-generator/index.ts)

---

## 8. LLM 分析流程

### 8.1 Analyzer Agent

```
LLMAnalyzerAgent.analyze(request)
    │
    ▼
┌─────────────────────┐
│ 准备 Traces         │ ──► 限制最多 20 条
│                     │ ──► 取最近的 traces
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 构建 Prompt         │
│                     │
│ System Prompt:      │
│ - 角色定义          │
│ - 分析约束          │ ──► 只能修改已引用 skills
│ - 输出格式          │ ──► 禁止建议新建 skills
│                     │
│ User Prompt:        │
│ - Skill 内容        │
│ - Traces 数据       │
│ - 当前版本          │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 调用 LLM            │ ──► 超时: 60s
│ (factory.ts)        │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 解析输出            │ ──► JSON 解析
│ (output-parser.ts)  │ ──► 字段验证
│                     │ ──► 置信度检查
└─────────────────────┘
    │
    ▼
返回 AnalysisResponse
```

**关键代码**: [src/core/analyzer/analyzer-agent.ts](../../src/core/analyzer/analyzer-agent.ts)

---

## 9. Shadow Skill 管理

### 9.1 Shadow 创建流程

```
Skill 首次被检测到
    │
    ▼
ShadowRegistry.createShadow(skillId, originPath)
    │
    ▼
┌─────────────────────┐
│ 1. 复制 Origin      │ ──► 从 ~/.codex/skills/{skill}
│    到项目目录       │     复制到 .ornn/skills/{skill}/origin/
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 2. 创建初始版本     │ ──► 创建 v1/
│                     │ ──► 复制 origin 内容
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 3. 创建 current.md  │ ──► 指向当前版本内容
│    软链接           │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 4. 初始化 journal   │ ──► 创建空的 journal.ndjson
└─────────────────────┘
    │
    ▼
Shadow 创建完成，开始追踪
```

### 9.2 版本演进流程

```
优化任务触发
    │
    ▼
ShadowRegistry.createNewVersion(skillId, patch, reason)
    │
    ▼
┌─────────────────────┐
│ 1. 计算新版本号     │ ──► currentVersion + 1
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 2. 创建新版本目录   │ ──► .ornn/skills/{skill}/v{N}/
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 3. 应用补丁         │ ──► 生成新内容
│                     │ ──► 写入 SKILL.md
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 4. 创建 metadata    │ ──► 版本信息
│                     │ ──► 变更原因
│                     │ ──► trace 引用
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 5. 更新 current     │ ──► 更新软链接
│    软链接           │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 6. 记录 journal     │ ──► 追加到 journal.ndjson
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 7. 创建快照         │ ──► 每 5 个版本创建快照
│    (可选)           │
└─────────────────────┘
    │
    ▼
版本演进完成
```

**关键代码**: [src/core/shadow-registry/index.ts](../../src/core/shadow-registry/index.ts)

---

## 10. 配置管理流程

### 10.1 配置加载优先级

```
配置加载 (ConfigManager)
    │
    ├──► 1. 默认配置 (defaults.ts)
    │      最低优先级
    │
    ├──► 2. 全局配置 (~/.ornn/settings.toml)
    │      用户级默认
    │
    ├──► 3. 项目配置 (.ornn/config/settings.toml)
    │      项目特定
    │
    └──► 4. 环境变量 (ORN_*)
           最高优先级
           │
           ▼
    合并后的配置对象
```

### 10.2 配置结构

```toml
# 全局配置 (~/.ornn/settings.toml)
[origin_paths]
paths = ["~/.skills", "~/.claude/skills"]

[observer]
enabled_runtimes = ["codex", "opencode", "claude"]
trace_retention_days = 30

[evaluator]
min_signal_count = 3
min_source_sessions = 2
min_confidence = 0.7

[patch]
allowed_types = ["append_context", "tighten_trigger", "add_fallback", "prune_noise"]
cooldown_hours = 24
max_patches_per_day = 3

[journal]
snapshot_interval = 5
max_snapshots = 20

[daemon]
auto_start = true
log_level = "info"
```

**关键代码**: [src/config/manager.ts](../../src/config/manager.ts)

---

## 11. 关键不变量与约束

### 11.1 架构约束

| 约束 | 说明 | 影响 |
|------|------|------|
| **无关键词/规则引擎** | Observer 层禁止正则匹配、关键词检测 | 所有分析必须走 LLM |
| **100% 数据保留** | Observer 不做任何语义过滤或截断 | 下游获得完整上下文 |
| **项目级隔离** | 不修改全局 Skill，只操作 Shadow 副本 | 安全回滚，无副作用 |
| **只能修改** | Analyzer 只能优化已引用 Skills | 禁止建议新建 Skills |
| **Skill 级并行** | 不同 Skills 可同时分析 | 提高吞吐量 |
| **Skill 内串行** | 同一 Skill 同时只能有一个分析任务 | 避免冲突 |

### 11.2 数据一致性

- **Trace 不可变**: 一旦写入，不允许修改
- **Shadow 版本化**: 每次变更创建新版本，旧版本保留
- **Journal 追加**: 演化日志只追加，不修改历史

---

## 12. 错误处理策略

### 12.1 超时控制

| 操作 | 超时时间 | 失败处理 |
|------|----------|----------|
| Pipeline 运行 | 30s | 返回空任务列表 |
| Evaluator 评估 | 10s | 跳过该 Skill |
| LLM 分析 | 60s | 返回错误响应 |
| 策略执行 | 5-10s | 返回失败结果 |

### 12.2 错误恢复

```
错误发生
    │
    ├──► 可恢复错误 ──► 记录日志 ──► 继续执行
    │
    └──► 致命错误 ──► 记录日志 ──► 优雅降级
```

---

*此文档由 summary-my-repo 技能自动生成*
