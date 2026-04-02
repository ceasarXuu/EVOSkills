# OrnnSkills 全量修复计划

> 基于全面代码审查，将 524 个 lint 问题（98 errors + 426 warnings）拆分为可独立执行、可回归验证的原子任务。

---

## 执行顺序总览

```
Phase 1: 自动修复 (lint --fix)          → 立竿见影，减少噪音
Phase 2: CLI 命令错误修复 (98 errors)    → 阻塞 CI，最高优先级
Phase 3: 安全与类型安全 (any 泄漏)       → 防止运行时错误
Phase 4: 日志体系统一 (console → logger) → 可运维性
Phase 5: 工程基建 (CI/CD, 覆盖率)        → 防止回归
Phase 6: 架构与文档                       → 长期可维护性
```

---

## Phase 1: 自动修复

### TODO-01: `eslint --fix` 自动修复

- **文件范围**: 全量 `src/`
- **操作**: `npx eslint src/ --ext .ts --fix`
- **预期**: 修复 16 个可自动修复的错误（`no-unnecessary-type-assertion` 等）
- **验证**: `npm run lint 2>&1 | grep "error" | wc -l` 应从 98 降到 ~82
- **回归测试**: 无需新增测试，lint 本身即验证

---

## Phase 2: CLI 命令错误修复 (98 errors → 0)

### TODO-02: 修复 `await-thenable` — 18 处

**根因**: 对非 Promise 返回值使用了 `await`。通常是因为被调用的同步函数被错误地标记为 async，或函数返回了同步值。

**受影响文件与行号**:

| 文件                           | 行号         | 问题描述                                              |
| ------------------------------ | ------------ | ----------------------------------------------------- |
| `src/cli/commands/diff.ts`     | 67           | `await shadowRegistry.init()` — init() 可能非 Promise |
| `src/cli/commands/freeze.ts`   | 54, 364      | 同上                                                  |
| `src/cli/commands/log.ts`      | 77           | 同上                                                  |
| `src/cli/commands/preview.ts`  | 55, 68       | `await journalManager.getLatestRevision()` 非 Promise |
| `src/cli/commands/rollback.ts` | 91           | 同上                                                  |
| `src/cli/commands/status.ts`   | 61, 115, 147 | 同上                                                  |
| `src/cli/commands/sync.ts`     | 63           | `await shadowRegistry.init()`                         |

**修复策略**:

1. 检查 `shadowRegistry.init()` 和 `journalManager.init()` 的实际返回类型
2. 如果这些函数返回 `void` 而非 `Promise<void>`，移除 `await`
3. 如果它们应该是异步的，修改其声明为 `async`
4. 检查 `getLatestRevision()` 的返回类型

**回归测试**: TODO-T01

---

### TODO-03: 修复 `no-floating-promises` — 16 处

**根因**: Promise 被创建但未被 await 或 .catch，错误被静默吞没。

**受影响文件与行号**:

| 文件                           | 行号                    | 问题描述         |
| ------------------------------ | ----------------------- | ---------------- |
| `src/cli/commands/diff.ts`     | 204                     | 未处理的 Promise |
| `src/cli/commands/log.ts`      | 221                     | 未处理的 Promise |
| `src/cli/commands/preview.ts`  | 84, 157                 | 未处理的 Promise |
| `src/cli/commands/rollback.ts` | 122, 154, 177, 184, 197 | 5 处未处理       |
| `src/cli/commands/status.ts`   | 70, 87, 164             | 3 处未处理       |

**修复策略**:

1. 识别每处 floating promise 的来源（通常是 `.close()` 或清理操作）
2. 对清理操作使用 `void promise` 显式标记为有意忽略
3. 对业务逻辑操作添加 `.catch()` 错误处理
4. 优先使用 `try/finally` 确保资源释放

**回归测试**: TODO-T02

---

### TODO-04: 修复 `require-await` — 16 处

**根因**: `async` 函数体内没有 `await` 表达式。

**受影响文件**:

| 文件                             | 行号     | 修复方式                          |
| -------------------------------- | -------- | --------------------------------- |
| `src/cli/commands/completion.ts` | 490      | 移除 `async` 关键字               |
| `src/cli/commands/daemon.ts`     | 170, 327 | 移除 `async` 或添加缺失的 `await` |
| `src/cli/commands/logs.ts`       | 122      | 移除 `async`                      |

**修复策略**:

1. 如果函数确实需要同步执行 → 移除 `async`
2. 如果函数应该异步但遗漏了 `await` → 添加 `await`
3. 注意：移除 `async` 可能影响调用方，需同步检查调用方

**回归测试**: 现有测试覆盖

---

### TODO-05: 修复 `no-unnecessary-type-assertion` — 16 处

**根因**: `as string` 等类型断言不改变类型，是冗余的。

**集中位置**:

- `src/cli/commands/freeze.ts` — 约 10 处 `(s.skill_id || s.skillId) as string` 等
- `src/cli/commands/status.ts` — 2 处
- `src/cli/commands/log.ts` — 2 处
- `src/cli/commands/rollback.ts` — 1 处

**修复策略**:

1. 移除冗余的 `as string` 断言
2. 如果类型确实需要收窄，使用类型守卫（type guard）替代
3. 修复上游类型定义，使 `shadowRegistry.list()` 返回精确类型

**回归测试**: TODO-T03

---

### TODO-06: 修复 `no-unsafe-argument` — 9 处

**根因**: 将 `any` 类型值传给需要特定类型的参数。

**集中位置**: `src/config/wizard.ts` (9 处)

**修复策略**:

1. 对 Inquirer 的 prompt 响应定义精确的 TypeScript 接口
2. 使用 zod 或手动校验对运行时值做类型收窄
3. 避免直接使用 `response.anyField`，改为 `const value: string = response.fieldName`

**回归测试**: TODO-T04

---

### TODO-07: 修复 `no-require-imports` — 6 处

**根因**: 使用 CommonJS `require()` 语法在 ESM 模块中。

**修复策略**:

1. 将所有 `require()` 改为 ESM `import`
2. 检查是否有动态导入需求，使用 `await import()` 替代

**回归测试**: 现有测试覆盖

---

### TODO-08: 修复 `no-redundant-type-constituents` — 6 处

**根因**: 联合类型中包含冗余类型（如 `string | string`）。

**修复策略**:

1. 检查类型定义，移除冗余部分
2. 可能是 `unknown | SomeType` 或 `any | SomeType` 的情况

**回归测试**: TypeScript 编译通过即验证

---

### TODO-09: 修复 `no-base-to-string` — 5 处

**根因**: 将对象直接用于模板字符串，会输出 `[object Object]`。

**集中位置**:

- `src/core/analyzer/output-parser.ts:201` — `suggestion.priority` 是对象而非字符串
- `src/cli/commands/freeze.ts:249, 560` — `unknown` 类型用于模板字符串

**修复策略**:

1. 对对象使用 `JSON.stringify()` 或提取具体属性
2. 对 `unknown` 类型先做类型检查再字符串化

**回归测试**: TODO-T05

---

### TODO-10: 修复 `no-unused-vars` — 2 处

**修复策略**: 移除未使用的变量，或用 `_` 前缀标记为有意忽略。

**回归测试**: ESLint 通过即验证

---

### TODO-11: 修复 `prefer-promise-reject-errors` — 1 处

**根因**: `Promise.reject()` 未传入 Error 对象。

**修复策略**: 将 `Promise.reject('message')` 改为 `Promise.reject(new Error('message'))`

**回归测试**: 现有测试覆盖

---

## Phase 3: 安全与类型安全

### TODO-12: 修复 `src/core/analyzer/output-parser.ts` 的 any 泄漏 — 12 处

**问题**: LLM JSON 响应解析后未做运行时验证，直接访问 `parsed.analysis.summary` 等属性。

**修复策略**:

1. 使用 zod 定义 `ParsedAnalysis` 的运行时 schema
2. 在 `JSON.parse()` 后用 `schema.parse()` 验证
3. 验证失败时返回 `ParseError` 而非抛出异常

**回归测试**: TODO-T06

---

### TODO-13: 修复 `src/cli/commands/daemon.ts` 的 any 泄漏 — 5 处

**问题**: 从 JSON/SQLite 读取的数据未做类型守卫，直接 `.processedTraces` 等访问。

**修复策略**:

1. 定义运行时类型守卫函数 `isDaemonStatus(data: unknown)`
2. 在所有 JSON.parse 或 SQLite 查询结果处应用类型守卫
3. 对未知数据使用可选链 `?.` 和空值合并 `??`

**回归测试**: TODO-T07

---

### TODO-14: 空 catch 块修复 — 2 处

**位置**: `src/cli/commands/logs.ts:30, 45`

**问题**: `catch {}` 静默吞没所有错误，包括文件系统权限错误。

**修复策略**:

1. 至少添加 debug 级别日志: `catch (e) { logger.debug('Failed to read log dir', { path, error: e }); }`
2. 或显式注释说明为何忽略: `catch { /* directory not accessible, skip */ }`

**回归测试**: TODO-T08

---

### TODO-15: 统一 `restrict-template-expressions` 警告 — 多处

**问题**: `unknown` 类型直接用于模板字符串。

**修复策略**:

1. 创建工具函数 `safeString(value: unknown): string`
2. 对所有 `unknown` 模板表达式使用此函数

**回归测试**: ESLint 通过即验证

---

## Phase 4: 日志体系统一

### TODO-16: CLI 命令日志迁移 (console → winston logger)

**规模**: 309 处 `console.*` 调用分布在 15 个文件中。

**按优先级分批**:

#### 4a. daemon.ts (58 处) — 最高优先级

- 守护进程是长期运行的后台进程，日志最重要
- 策略: 创建 `cli-logger.ts` 封装，支持同时输出到 stdout 和 winston 文件

#### 4b. freeze.ts (70 处) — 高优先级

- 最长的 CLI 命令文件，日志最多
- 策略: 同上

#### 4c. preview.ts (36 处) / logs.ts (26 处) / sync.ts (21 处)

- 策略: 同上

#### 4d. 其余文件 (status.ts 19, log.ts 16, rollback.ts 16, diff.ts 10, completion.ts 2)

**统一策略**:

```typescript
// src/utils/cli-output.ts — 新建
import { logger } from './logger.js';

export function cliInfo(msg: string): void {
  logger.info(msg);
  console.log(msg); // 保持用户可见
}

export function cliWarn(msg: string): void {
  logger.warn(msg);
  console.warn(msg);
}

export function cliError(msg: string): void {
  logger.error(msg);
  console.error(msg);
}
```

**回归测试**: TODO-T09

---

## Phase 5: 工程基建

### TODO-17: 添加 GitHub Actions CI/CD

**文件**: `.github/workflows/ci.yml`

**内容**:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

**回归测试**: CI 绿色即验证

---

### TODO-18: 添加 vitest 覆盖率阈值

**文件**: `vitest.config.ts`

**操作**: 添加 `coverage.thresholds` 配置

```typescript
coverage: {
  thresholds: {
    lines: 60,
    functions: 50,
    branches: 40,
    statements: 60,
  },
}
```

**回归测试**: `npm run test:coverage` 通过

---

### TODO-19: 补充 CLI 命令单元测试

**新建测试文件** (每个 CLI 命令一个):

| 测试文件                               | 覆盖命令        | 测试用例                            |
| -------------------------------------- | --------------- | ----------------------------------- |
| `tests/unit/commands/status.test.ts`   | status          | 正常流程、无 skills、.ornn 不存在   |
| `tests/unit/commands/rollback.test.ts` | rollback        | 正常回滚、无效 revision、force 模式 |
| `tests/unit/commands/freeze.test.ts`   | freeze/unfreeze | 冻结、解冻、批量操作                |
| `tests/unit/commands/diff.test.ts`     | diff            | 正常 diff、origin 比较              |
| `tests/unit/commands/sync.test.ts`     | sync            | 正常同步、冲突检测                  |

**回归测试**: 新测试全部通过

---

### TODO-20: 补充核心模块单元测试

**缺失测试的核心模块**:

| 模块                        | 测试文件                             | 优先级 |
| --------------------------- | ------------------------------------ | ------ |
| `src/core/pipeline/`        | `tests/unit/pipeline.test.ts`        | P1     |
| `src/core/shadow-manager/`  | `tests/unit/shadow-manager.test.ts`  | P1     |
| `src/core/patch-generator/` | `tests/unit/patch-generator.test.ts` | P2     |
| `src/core/evaluator/`       | `tests/unit/evaluator.test.ts`       | P2     |
| `src/core/origin-registry/` | `tests/unit/origin-registry.test.ts` | P2     |
| `src/llm/factory.ts`        | `tests/unit/llm-factory.test.ts`     | P3     |

**回归测试**: 新测试全部通过

---

## Phase 6: 架构与文档

### TODO-21: 修复 README 术语不一致

**操作**:

- README 中 `TraceSkillObserver` → `TraceManager` (或添加别名)
- 架构图中的模块名与代码文件名对齐

---

### TODO-22: 创建 ARCHITECTURE.md

**内容**:

- 模块依赖图
- 数据流说明 (Trace → Mapper → Evaluator → PatchGenerator → ShadowRegistry)
- 每个模块的输入/输出契约
- 初始化生命周期

---

### TODO-23: 统一初始化生命周期

**问题**: `init()` vs `initAsync()` vs 懒加载

**操作**: 所有核心模块统一为 `async init(): Promise<void>` 模式

---

### TODO-24: 清理未实现的 TODO 方法

**位置**: `src/core/journal/index.ts` (8 个 TODO)

**操作**:

- 评估每个 TODO 是否真的需要
- 不需要的: 删除方法声明
- 需要的: 实现或标记为 `@deprecated`

---

## 回归测试设计

### TODO-T01: await-thenable 回归测试

```typescript
// tests/unit/cli-async-correctness.test.ts
describe('CLI async correctness', () => {
  it('shadowRegistry.init() returns Promise<void>', async () => {
    const registry = createShadowRegistry('/tmp/test');
    const result = registry.init();
    expect(result).toBeInstanceOf(Promise);
    await result; // should not throw
  });

  it('journalManager.init() returns Promise<void>', async () => {
    const jm = createJournalManager('/tmp/test');
    const result = jm.init();
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it('journalManager.getLatestRevision() returns Promise', async () => {
    const jm = createJournalManager('/tmp/test');
    await jm.init();
    const result = jm.getLatestRevision('test-skill');
    expect(result).toBeInstanceOf(Promise);
  });
});
```

### TODO-T02: Floating Promise 回归测试

```typescript
// tests/unit/cli-resource-cleanup.test.ts
describe('CLI resource cleanup', () => {
  it('all CLI commands properly clean up resources', async () => {
    // Mock shadowRegistry and journalManager
    // Execute each command action
    // Verify .close() was called on all resources
    // Verify no unhandled promise rejections
  });

  it('rollback command handles errors during cleanup', async () => {
    // Simulate rollback failure
    // Verify resources are still cleaned up (finally block)
  });
});
```

### TODO-T03: 类型断言回归测试

```typescript
// tests/unit/shadow-registry-types.test.ts
describe('ShadowRegistry type safety', () => {
  it('list() returns properly typed objects', () => {
    const registry = createShadowRegistry('/tmp/test');
    // After fix, no `as string` should be needed
    const items = registry.list();
    for (const item of items) {
      expect(typeof item.skill_id).toBe('string');
    }
  });
});
```

### TODO-T04: Config Wizard 类型安全回归测试

```typescript
// tests/unit/config-wizard.test.ts
describe('Config Wizard type safety', () => {
  it('inquirer responses are properly typed', async () => {
    // Mock inquirer
    // Verify all response fields are validated before use
  });

  it('provider name is validated before string operations', () => {
    // Ensure toUpperCase().replace() is only called on validated strings
  });
});
```

### TODO-T05: Template string 回归测试

```typescript
// tests/unit/safe-string.test.ts
describe('safeString utility', () => {
  it('handles all types correctly', () => {
    expect(safeString('hello')).toBe('hello');
    expect(safeString(42)).toBe('42');
    expect(safeString(null)).toBe('null');
    expect(safeString(undefined)).toBe('undefined');
    expect(safeString({ key: 'value' })).toBe('{"key":"value"}');
    expect(safeString([1, 2])).toBe('[1,2]');
  });
});
```

### TODO-T06: Output Parser 运行时验证回归测试

```typescript
// tests/unit/output-parser-validation.test.ts
describe('OutputParser runtime validation', () => {
  it('rejects malformed LLM responses', () => {
    const result = parseAnalysisOutput('not json at all');
    expect(result.success).toBe(false);
  });

  it('rejects JSON missing required fields', () => {
    const result = parseAnalysisOutput(JSON.stringify({ analysis: {} }));
    expect(result.success).toBe(false);
  });

  it('accepts well-formed responses', () => {
    const validResponse = JSON.stringify({
      analysis: {
        summary: 'test',
        strengths: [],
        weaknesses: [],
        missingScenarios: [],
        userPainPoints: [],
      },
      suggestions: [],
      improvedSkill: '# Test',
      confidence: 0.8,
    });
    const result = parseAnalysisOutput(validResponse);
    expect(result.success).toBe(true);
  });
});
```

### TODO-T07: Daemon 类型安全回归测试

```typescript
// tests/unit/daemon-type-safety.test.ts
describe('Daemon type safety', () => {
  it('daemon status parsing handles malformed data', () => {
    // Test with null, undefined, empty object, wrong types
  });

  it('daemon stats handles missing fields gracefully', () => {
    // Test with partial data from SQLite
  });
});
```

### TODO-T08: 空 catch 块回归测试

```typescript
// tests/unit/logs-error-handling.test.ts
describe('Logs command error handling', () => {
  it('handles inaccessible log directories gracefully', () => {
    // Mock readdirSync to throw EACCES
    // Verify command doesn't crash
    // Verify error is logged (not silently swallowed)
  });
});
```

### TODO-T09: 日志迁移回归测试

```typescript
// tests/unit/cli-logging.test.ts
describe('CLI logging', () => {
  it('cliInfo logs to both console and winston', () => {
    // Mock console.log and logger.info
    cliInfo('test message');
    expect(console.log).toHaveBeenCalledWith('test message');
    expect(logger.info).toHaveBeenCalledWith('test message');
  });

  it('cliError logs error level to winston', () => {
    // Verify error level, not info
  });
});
```

---

## 执行时间表

| Phase | 任务                         | 预估时间 | 依赖    |
| ----- | ---------------------------- | -------- | ------- |
| 1     | TODO-01 (自动修复)           | 5 分钟   | 无      |
| 2     | TODO-02 ~ TODO-11 (错误修复) | 3-4 小时 | Phase 1 |
| 3     | TODO-12 ~ TODO-15 (类型安全) | 2-3 小时 | Phase 2 |
| 4     | TODO-16 (日志迁移)           | 2-3 小时 | Phase 2 |
| 5     | TODO-17 ~ TODO-20 (工程基建) | 4-6 小时 | Phase 3 |
| 6     | TODO-21 ~ TODO-24 (架构文档) | 2-3 小时 | 可并行  |

**总计预估**: 14-19 小时

---

## 验收标准

1. ✅ `npm run lint` — 0 errors, 0 warnings (或仅剩 `no-console` 如果选择保留部分)
2. ✅ `npm run typecheck` — 0 errors
3. ✅ `npm run build` — 成功
4. ✅ `npm test` — 所有测试通过 (含新增回归测试)
5. ✅ `npm run test:coverage` — 达到阈值
6. ✅ CI workflow 绿色
