# OrnnSkills 项目进度

## 📊 总体进度：Phase 1 ✅ 完成

### 2026-04-11
- ✅ 修复本地 link 后 `ornn` CLI 可能报 `permission denied` 的问题：构建和 prepare 阶段统一补齐 `dist/cli/index.js` 的可执行权限
- 📝 记录环境经验：`npm link` 只负责创建全局软链，不会保证 `tsc` 产物自动带可执行位；如果 `which ornn` 能找到命令但执行报权限错误，优先检查 `dist/cli/index.js` 是否缺少 `+x`

| 阶段 | 状态 | 进度 | 预计时间 |
|------|------|------|---------|
| Phase 1: 基础框架 | ✅ 完成 | 100% | 2 周 |
| Phase 2: Registry | 🔄 进行中 | 0% | 2 周 |
| Phase 3: Observer Layer | ⏳ 待开始 | 0% | 2 周 |
| Phase 4: Evaluator & Patch | ⏳ 待开始 | 0% | 3 周 |
| Phase 5: 自动循环 | ⏳ 待开始 | 0% | 2 周 |
| Phase 6: Rollback & Rebase | ⏳ 待开始 | 0% | 1.5 周 |
| Phase 7: CLI 完善 | ⏳ 待开始 | 0% | 1.5 周 |
| Phase 8: 测试 & 打包 | ⏳ 待开始 | 0% | 2 周 |

---

## Phase 1: 基础框架 ✅ 完成

### 已完成的任务

#### 1. 项目初始化 ✅
- [x] package.json 配置
- [x] TypeScript 配置 (tsconfig.json)
- [x] ESLint 配置
- [x] Prettier 配置
- [x] Vitest 测试框架配置
- [x] 项目目录结构搭建

#### 2. 全局类型定义 ✅
- [x] `src/types/index.ts` - 核心类型定义
  - ✅ `OriginSkill` - 原始 skill 类型
  - ✅ `ProjectSkillShadow` - 影子 skill 类型
  - ✅ `EvolutionRecord` - 演化记录类型
  - ✅ `Trace` - 执行轨迹类型
  - ✅ `EvaluationResult` - 评估结果类型
  - ✅ `ShadowStatus` - 状态枚举
  - ✅ `ChangeType` - 修改类型枚举
  - ✅ 其他辅助类型

#### 3. 工具函数库 ✅
- [x] `src/utils/hash.ts` - 哈希计算工具
  - ✅ `hashContent()` - 内容哈希
  - ✅ `hashFile()` - 文件哈希
  - ✅ `shortHash()` - 短哈希
  - ✅ `compareHash()` - 哈希比较
- [x] `src/utils/diff.ts` - Diff 工具
  - ✅ `generateDiff()` - 生成 unified diff
  - ✅ `applyDiff()` - 应用 diff
  - ✅ `parseDiff()` - 解析 diff
  - ✅ `hasChanges()` - 检测变化
- [x] `src/utils/path.ts` - 路径工具
  - ✅ `expandHome()` - 展开 home 目录
  - ✅ `getEvoDir()` - 获取 .ornn 目录
  - ✅ `getSkillsDir()` - 获取 skills 目录
  - ✅ `getStateDir()` - 获取 state 目录
  - ✅ `getConfigDir()` - 获取 config 目录
  - ✅ 其他路径工具函数
- [x] `src/utils/logger.ts` - 日志工具
  - ✅ Winston 日志配置
  - ✅ 文件和控制台输出
  - ✅ 日志级别管理
  - ✅ 子 logger 创建
- [x] `src/utils/index.ts` - 工具函数导出

#### 4. 配置管理系统 ✅
- [x] `src/config/defaults.ts` - 默认配置
  - ✅ Origin paths 配置
  - ✅ Observer 配置
  - ✅ Evaluator 配置
  - ✅ Patch 配置
  - ✅ Journal 配置
  - ✅ Daemon 配置
- [x] `src/config/index.ts` - 配置管理器
  - ✅ `ConfigManager` 类
  - ✅ 全局配置加载
  - ✅ 项目配置加载
  - ✅ 配置合并逻辑
  - ✅ 配置验证

#### 5. 存储层 ✅
- [x] `src/storage/sqlite.ts` - SQLite 存储
  - ✅ 数据库初始化
  - ✅ Shadow skills 表操作
  - ✅ Sessions 表操作
  - ✅ Traces 索引表操作
  - ✅ Snapshots 表操作
  - ✅ Evolution records 索引表操作
- [x] `src/storage/ndjson.ts` - NDJSON 存储
  - ✅ `NDJSONWriter` - 写入器
  - ✅ `NDJSONReader` - 读取器
  - ✅ `TraceStore` - Trace 存储
  - ✅ `JournalStore` - Journal 存储
- [x] `src/storage/markdown.ts` - Markdown 操作
  - ✅ `MarkdownSkill` 类
  - ✅ 读取/写入 skill
  - ✅ 从 origin 复制
  - ✅ Frontmatter 解析
- [x] `src/storage/index.ts` - 存储层导出

---

## Phase 2: Registry 🔄 进行中

### 计划任务

#### 1. Origin Registry
- [ ] `src/core/origin-registry/scanner.ts` - 目录扫描器
- [ ] `src/core/origin-registry/index.ts` - Origin Registry 主类
- [ ] `src/core/origin-registry/types.ts` - 类型定义

#### 2. Shadow Registry
- [ ] `src/core/shadow-registry/manager.ts` - Shadow 管理器
- [ ] `src/core/shadow-registry/index.ts` - Shadow Registry 主类
- [ ] `src/core/shadow-registry/types.ts` - 类型定义

#### 3. Journal Manager
- [ ] `src/core/journal/writer.ts` - Journal 写入器
- [ ] `src/core/journal/reader.ts` - Journal 读取器
- [ ] `src/core/journal/snapshot.ts` - Snapshot 管理
- [ ] `src/core/journal/rollback.ts` - 回滚逻辑
- [ ] `src/core/journal/index.ts` - Journal Manager 主类

---

## 测试进度

### 单元测试
- [x] `tests/unit/path.test.ts` - 路径工具测试 ✅
- [ ] `tests/unit/hash.test.ts` - 哈希工具测试
- [ ] `tests/unit/diff.test.ts` - Diff 工具测试
- [ ] `tests/unit/config.test.ts` - 配置管理测试
- [ ] `tests/unit/storage.test.ts` - 存储层测试

### 集成测试
- [ ] `tests/integration/observer-integration.test.ts`
- [ ] `tests/integration/full-evolution-cycle.test.ts`
- [ ] `tests/integration/rollback.test.ts`

---

## 下一步行动

### 立即执行（Phase 2）
1. 实现 Origin Registry
   - 扫描本机 skills 目录
   - 读取 skill 元数据
   - 计算文件 hash
2. 实现 Shadow Registry
   - 创建 shadow skill
   - 管理 shadow 状态
   - 初始化项目目录结构
3. 实现 Journal Manager
   - 写入演化记录
   - 读取 journal
   - 管理 revision

### 验收标准
- [ ] `ornn skills status` 命令可用
- [ ] 能自动发现本机 origin skills
- [ ] 能在项目中创建 shadow skills
- [ ] 能记录演化日志

---

## 技术债务

暂无

---

## 问题和风险

暂无

---

## 更新日志

### 2026-03-21
- ✅ 完成 Phase 1 所有任务
- ✅ 项目基础框架搭建完成
- ✅ 存储层实现完成
- ✅ 工具函数库完成
- ✅ 配置系统完成
- 🔄 开始 Phase 2 开发

---

*最后更新：2026-03-21*
*更新人：OrnnSkills Team*
