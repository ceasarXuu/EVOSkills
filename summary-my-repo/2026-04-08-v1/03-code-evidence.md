# 代码证据

## S01

- `Snippet ID`: `S01`
- `File`: `src/cli/index.ts:33-89`
- `Claim`: CLI 已把初始化、daemon、skills 生命周期管理、config、dashboard 等能力全部公开为正式命令。

```ts
// Init 命令
program
  .command('init')
  .description('Initialize Ornn Skills in current project')
  .option('-f, --force', 'Force reconfiguration even if already initialized', false)
  .action(async (options: { force?: boolean }) => {
    try {
      await initCommand(process.cwd(), { force: options.force ?? false });
    } catch (error) {
      logger.error('Failed to initialize Ornn Skills:', error);
      process.exit(1);
    }
  });

// Skills 子命令
const skills = new Command('skills').description('Manage shadow skills');

skills.addCommand(createStatusCommand());
skills.addCommand(createRollbackCommand());
skills.addCommand(createLogCommand());
skills.addCommand(createDiffCommand());
skills.addCommand(createSyncCommand());
skills.addCommand(createFreezeCommand());
skills.addCommand(createUnfreezeCommand());
skills.addCommand(createPreviewCommand());

program.addCommand(skills);

// Start 命令 (简化版 daemon start)
program.addCommand(createStartCommand());

// Stop 命令 (简化版 daemon stop)
program.addCommand(createStopCommand());

// Restart 命令 (简化版 daemon restart)
program.addCommand(createRestartCommand());

// Status 命令 (整体状态概览)
program.addCommand(createTopLevelStatusCommand());

// Daemon 命令 (完整的子命令)
program.addCommand(createDaemonCommand());

// Logs 命令
program.addCommand(createLogsCommand());

// Completion 命令
program.addCommand(createCompletionCommand());

// Config 命令
program.addCommand(createConfigCommand());

// Dashboard 命令
program.addCommand(createDashboardCommand());

// 解析命令行参数
program.parse();
```

- `Interpretation`: 这不是只做内部库的仓库；核心能力已经通过 CLI 产品化，说明 repo 的理解起点应从命令面开始，而不是直接钻入底层模块。

## S02

- `Snippet ID`: `S02`
- `File`: `src/daemon/index.ts:92-124`
- `Claim`: daemon 启动顺序是先初始化 shadow 管理，再接 observer trace 回调，最后启动 watcher 和后台任务。

```ts
try {
  // 1. 初始化 shadow manager
  await this.shadowManager.init();
  logger.debug('Shadow manager initialized');

  // 2. 设置 trace 回调（带重试机制）
  this.codexObserver.onTrace((trace) => {
    void this.processTraceWithRetry(trace);
  });

  // 3. 启动 codex observer
  this.codexObserver.start();
  logger.debug('Codex observer started');

  // 4. 监听项目 .sea 目录变化
  this.startFileWatcher();

  // 5. 启动定时清理任务
  this.startCleanupTask();

  // 6. 设置状态为运行中
  this.isRunning = true;
  this.startedAt = new Date().toISOString();

  // Update global project registry so dashboard can discover this project
  try {
    touchProject(this.projectRoot);
  } catch {
    // Non-fatal
  }

  // 7. 注册优雅退出处理
  this.registerShutdownHooks();
```

- `Interpretation`: observer 不是独立自运行的；它被 daemon 包在一个更大的后台生命周期里，而 shadow manager 的初始化是所有观察之前的前置条件。

## S03

- `Snippet ID`: `S03`
- `File`: `src/core/shadow-manager/index.ts:81-107`
- `Claim`: ShadowManager 会同时扫描项目内与全局 skill 根目录，并按 runtime 维度选择候选 skill 来源。

```ts
// 宿主对齐：项目内 + 全局同扫；同名按项目优先，且按 runtime 维度独立决议来源。
const projectRoots = [
  join(this.projectRoot, '.codex', 'skills'),
  join(this.projectRoot, '.claude', 'skills'),
  join(this.projectRoot, '.opencode', 'skills'),
  join(this.projectRoot, 'skills'),
  join(this.projectRoot, '.skills'),
  join(this.projectRoot, '.agents', 'skills'),
];
const globalRoots = [
  ...configManager.getOriginPaths(),
  join(homedir(), '.agents', 'skills'),
  join(homedir(), '.codex', 'skills'),
];
const candidateRoots = [...new Set<string>([...projectRoots, ...globalRoots])];
const selectedSourceByRuntimeSkill = new Map<
  string,
  { root: string; skillPath: string; content: string; isProjectSource: boolean }
>();

const runtimes = configManager.getGlobalConfig().observer.enabled_runtimes;
let discovered = 0;
let registered = 0;
let createdShadows = 0;
let bootstrapVersionedUpdates = 0;
let materializedToProject = 0;
const originUpserted = new Set<string>();
```

- `Interpretation`: 这段代码证明“项目隔离”不是 README 口号，而是 bootstrap 时真实执行的来源决议规则。

## S04

- `Snippet ID`: `S04`
- `File`: `src/core/shadow-manager/index.ts:193-218`
- `Claim`: 每个 runtime-skill 组合都会写入 shadow 元数据，并同步注册给 mapper。

```ts
const shadowEntry = this.shadowRegistry.get(skillId, runtime);
const status: ShadowStatus = shadowEntry?.status === 'frozen' ? 'frozen' : 'active';
const shadow = {
  project_id: this.projectRoot,
  skill_id: scopedKey,
  runtime,
  shadow_id: buildShadowId(skillId, this.projectRoot, runtime),
  origin_skill_id: skillId,
  origin_version_at_fork: originVersion,
  shadow_path: join(this.projectRoot, '.ornn', 'shadows', runtime, `${skillId}.md`),
  current_revision: 0,
  status,
  created_at: now,
  last_optimized_at: now,
};
this.db.upsertShadowSkill(shadow);
const originForMapper = {
  skill_id: skillId,
  origin_path: selected.skillPath,
  origin_version: originVersion,
  source: 'local' as const,
  installed_at: now,
  last_seen_at: now,
};
this.traceSkillMapper.registerSkill(originForMapper, shadow);
registered++;
```

- `Interpretation`: 归因系统依赖 bootstrap 结果；如果没有这一步，后续 trace 即使命中 skill 名，也拿不到有效 shadow id。

## S05

- `Snippet ID`: `S05`
- `File`: `src/core/trace-skill-mapper/index.ts:89-120`
- `Claim`: mapper 至少实现了两条高置信度归因路径: 直接读取 skill 文件，以及基于工具调用推断 skill。

```ts
mapTrace(trace: Trace): TraceSkillMapping {
  // 策略 1: 检测 tool_call 中读取 skill 文件
  if (trace.event_type === 'tool_call' && trace.tool_name === 'read_file') {
    const filePath = trace.tool_args?.path as string;
    if (filePath) {
      const skillId = this.extractSkillIdFromPath(filePath);
      if (skillId && this.knownSkills.has(skillId)) {
        const shadow = this.getRuntimeShadow(skillId, trace.runtime);
        return {
          trace_id: trace.trace_id,
          skill_id: skillId,
          shadow_id: shadow?.shadow_id ?? null,
          confidence: 0.95,
          reason: `read_file on skill file: ${filePath}`,
        };
      }
    }
  }

  // 策略 2: 检测 tool_call 中执行 skill 相关操作
  if (trace.event_type === 'tool_call') {
    const skillId = this.inferSkillFromToolCall(trace);
    if (skillId) {
      const shadow = this.getRuntimeShadow(skillId, trace.runtime);
      return {
        trace_id: trace.trace_id,
        skill_id: skillId,
        shadow_id: shadow?.shadow_id ?? null,
        confidence: 0.85,
```

- `Interpretation`: 系统优先信“直接接触 skill 文件”的证据，但也保留工具行为推断，说明它兼顾精确率和召回率。

## S06

- `Snippet ID`: `S06`
- `File`: `src/core/trace-skill-mapper/index.ts:123-180`
- `Claim`: mapper 还支持 file change、metadata、assistant output、user input 四条补充归因路径，并为每条路径编码了不同置信度。

```ts
// 策略 3: 检测 file_change 中修改 skill 文件
if (trace.event_type === 'file_change' && trace.files_changed) {
  for (const filePath of trace.files_changed) {
    const skillId = this.extractSkillIdFromPath(filePath);
    if (skillId && this.knownSkills.has(skillId)) {
      const shadow = this.getRuntimeShadow(skillId, trace.runtime);
      return {
        trace_id: trace.trace_id,
        skill_id: skillId,
        shadow_id: shadow?.shadow_id ?? null,
        confidence: 0.9,
        reason: `file_change on skill file: ${filePath}`,
      };
    }
  }
}

// 策略 4: 检测 metadata 中的 skill 信息
if (trace.metadata?.skill_id) {
  const skillId = trace.metadata.skill_id as string;
  if (this.knownSkills.has(skillId)) {
    const shadow = this.getRuntimeShadow(skillId, trace.runtime);
    return {
      trace_id: trace.trace_id,
      skill_id: skillId,
      shadow_id: shadow?.shadow_id ?? null,
      confidence: 0.98,
      reason: 'skill_id from trace metadata',
    };
  }
}

// 策略 5: 从 assistant_output 推断 skill 引用
if (trace.event_type === 'assistant_output' && trace.assistant_output) {
  const skillId = this.inferSkillFromOutput(trace.assistant_output);
  if (skillId) {
    const shadow = this.getRuntimeShadow(skillId, trace.runtime);
    return {
      trace_id: trace.trace_id,
      skill_id: skillId,
      shadow_id: shadow?.shadow_id ?? null,
      confidence: 0.6,
      reason: `skill reference in assistant output`,
    };
  }
}

// 策略 6: 从 user_input 推断 skill 请求
if (trace.event_type === 'user_input' && trace.user_input) {
```

- `Interpretation`: 这不是单一规则硬编码，而是一个分层置信度模型；后续优化阈值判断依赖这些分数。

## S07

- `Snippet ID`: `S07`
- `File`: `src/core/pipeline/index.ts:123-158`
- `Claim`: OptimizationPipeline 的批处理主循环是“取最近 traces -> map/group -> 逐组评估 -> 产出任务”。

```ts
// Step 1: 获取最近的 traces
const recentTraces = await this.traceManager.getRecentTraces(100);
if (recentTraces.length === 0) {
  logger.info('No recent traces found, skipping pipeline run');
  return [];
}

// Step 2: 将 traces 映射到 skills 并分组
const skillGroups = this.traceSkillMapper.mapAndGroupTraces(recentTraces);
logger.info('Traces mapped to skills', { groups: skillGroups.length });

// Step 3: 对每个 skill 分组进行评估（带超时控制）
for (const group of skillGroups) {
  try {
    const task = await this.evaluateSkillGroup(group);
    if (task) {
      tasks.push(task);
    }
  } catch (error) {
    const errorMsg = `Failed to evaluate skill ${group.skill_id}: ${String(error)}`;
    logger.error(errorMsg);
    this.addError(errorMsg);
  }
}

// 更新状态
this.state.processedTraces += recentTraces.length;
this.state.generatedTasks += tasks.length;
this.state.lastRunAt = new Date().toISOString();

logger.info('Pipeline run completed', {
  processedTraces: recentTraces.length,
  generatedTasks: tasks.length,
});
```

- `Interpretation`: 这一层不直接写 patch，而是先生成优化任务，说明它更适合作为调度器或批量控制器。

## S08

- `Snippet ID`: `S08`
- `File`: `src/core/pipeline/index.ts:180-220`
- `Claim`: pipeline 只有在 shadow 存在、未冻结且评估置信度满足阈值时才会产出优化任务。

```ts
private async evaluateSkillGroup(group: SkillTracesGroup): Promise<OptimizationTask | null> {
  const { skill_id, shadow_id, traces } = group;
  const runtime = runtimeFromShadowId(shadow_id) ?? 'codex';

  // 检查 shadow skill 是否存在
  const shadow = this.shadowRegistry.get(skill_id, runtime);
  if (!shadow) {
    logger.debug('Shadow skill not found, skipping', { skill_id, runtime });
    return null;
  }

  // 检查是否被冻结
  if (shadow.status === 'frozen') {
    logger.debug('Shadow skill is frozen, skipping', { skill_id, runtime });
    return null;
  }

  // 使用 evaluator 评估 traces（带超时控制）
  const evaluation = await this.evaluateWithTimeout(traces, 10000);
  if (!evaluation || !evaluation.should_patch) {
    logger.debug('No optimization needed for skill', { skill_id });
    return null;
  }

  // 检查置信度
  if (evaluation.confidence < this.config.minConfidence) {
    logger.debug('Confidence too low, skipping', {
      skill_id,
      confidence: evaluation.confidence,
      minConfidence: this.config.minConfidence,
    });
    return null;
  }

  logger.info('Optimization task generated', {
```

- `Interpretation`: evaluator 不是唯一闸门；shadow 状态和配置阈值同样是主逻辑的一部分。

## S09

- `Snippet ID`: `S09`
- `File`: `src/core/shadow-manager/index.ts:391-430`
- `Claim`: patch 执行会读取当前 shadow、生成 patch、写回 shadow，并把 before/after hash 与 patch 内容写入 journal。

```ts
try {
  // 读取当前内容
  const currentContent = this.shadowRegistry.readContent(skillId, runtime);
  if (!currentContent) {
    logger.warn(`Cannot read shadow content: ${skillId}`);
    return;
  }

  // 生成 patch
  const context = {
    pattern: evaluation.reason,
    reason: evaluation.reason,
    section: evaluation.target_section,
  };

  const patchResult = await patchGenerator.generate(
    evaluation.change_type!,
    currentContent,
    context
  );

  if (!patchResult.success) {
    logger.warn(`Patch generation failed: ${patchResult.error}`);
    return;
  }

  // 获取当前 revision
  const currentRevision = this.journalManager.getLatestRevision(shadowId);

  // 写入新内容
  this.shadowRegistry.writeContent(skillId, patchResult.newContent, runtime);

  // 记录演化
  this.journalManager.record(shadowId, {
    shadow_id: shadowId,
    timestamp: new Date().toISOString(),
    reason: evaluation.reason ?? 'Auto optimization',
    source_sessions: evaluation.source_sessions,
    change_type: evaluation.change_type!,
    patch: patchResult.patch,
```

- `Interpretation`: shadow 内容本身不是唯一事实源；journal 同时保存了可审计的变化原因和 patch 结果，是回滚与追责链的重要组成部分。

## S10

- `Snippet ID`: `S10`
- `File`: `src/core/skill-deployer/index.ts:82-128`
- `Claim`: deployer 按 runtime 决定写回目录，并在写回 skill 时注入版本元信息头。

```ts
private getTargetPath(skillId: string): string {
  switch (this.options.runtime) {
    case 'codex':
      return join(this.options.projectPath, '.codex', 'skills', skillId, 'SKILL.md');

    case 'claude':
      return join(this.options.projectPath, '.claude', 'skills', skillId, 'SKILL.md');

    case 'opencode':
      return join(this.options.projectPath, '.opencode', 'skills', skillId, 'SKILL.md');

    default:
      throw new Error(`Unsupported runtime: ${String(this.options.runtime)}`);
  }
}

/**
 * Inject version header into skill content
 * Handles frontmatter (---) correctly by inserting after frontmatter
 */
private injectVersionHeader(version: SkillVersion, skillId: string): string {
  const metadata = version.metadata;

  const header = `<!-- Ornn Version: v${version.version} -->
<!-- Origin: ${this.options.projectPath}/.ornn/skills/${this.options.runtime}/${skillId} -->
<!-- Runtime: ${this.options.runtime} -->
<!-- Project: ${this.options.projectPath} -->
<!-- Last Optimized: ${metadata.createdAt} -->
<!-- Optimization Reason: ${metadata.reason} -->

`;

  let content = version.content;

  // Remove existing Ornn headers first
```

- `Interpretation`: runtime 目录不是简单缓存；部署结果本身带版本来源信息，便于现场排查“这个 skill 为什么长这样”。

## S11

- `Snippet ID`: `S11`
- `File`: `src/storage/sqlite.ts:84-120`
- `Claim`: SQLite 状态保存使用临时文件加原子替换，显式降低并发写损坏风险。

```ts
async init(): Promise<void> {
  // 确保目录存在
  const dir = join(this.dbPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // 初始化 sql.js
  const SQL = await initSqlJs();

  // 尝试加载现有数据库
  if (existsSync(this.dbPath)) {
    const buffer = readFileSync(this.dbPath);
    this.db = new SQL.Database(buffer);
  } else {
    this.db = new SQL.Database();
  }

  this.createTables();
  this.save();
  logger.debug('Database initialized', { path: this.dbPath });
}

/**
 * 保存数据库到文件（原子写入）
 */
private save(): void {
  if (!this.db) throw new Error('Database not initialized');
  const data = this.db.export();
  const buffer = Buffer.from(data);

  // 使用唯一临时文件实现原子写入（防止多进程并发冲突）
  const uniqueId = randomBytes(8).toString('hex');
  const tempPath = `${this.dbPath}.${process.pid}.${uniqueId}.tmp`;
  try {
    writeFileSync(tempPath, buffer);
    renameSync(tempPath, this.dbPath); // 原子替换
```

- `Interpretation`: 仓库作者已经明确把“状态文件可靠落盘”当成系统约束，而不是事后补丁。
