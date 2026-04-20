# Dashboard 缓存分阶段实施方案

**版本**: v1  
**日期**: 2026-04-21  
**状态**: Phase 1-3 已落地并完成本地验证

## 1. 背景

当前 Dashboard 在浏览器硬刷新后的启动路径，基本等同于一次全量重建：

- `/` 返回的 HTML 内联了完整 CSS + JS，入口响应在当前环境约为 `338 KB`
- HTML 在 [src/dashboard/server.ts](/Users/xuzhang/OrnnSkills/src/dashboard/server.ts:250) 被显式设置为 `no-store`
- JSON 接口在 [src/dashboard/server.ts](/Users/xuzhang/OrnnSkills/src/dashboard/server.ts:94) 被设置为 `no-cache`
- 前端状态在 [src/dashboard/web/state.ts](/Users/xuzhang/OrnnSkills/src/dashboard/web/state.ts:9) 每次从空对象启动
- `init()` 会重新拉取 `/api/projects`、`/api/logs`，并自动加载 skill library 与选中项目 snapshot

当前环境的实测量级如下：

- `projects` 响应约 `749 B`
- `skills/families` 响应约 `31 KB`
- 单个项目 `/snapshot` 响应约 `20 KB - 100 KB`

结论：

- 服务端 reader cache 只能减少后端重复计算，不能改善浏览器硬刷新体感
- 真正需要的是浏览器首屏 bootstrap cache + 后续按需重验证
- 单独做 HTTP 头修改，不能解决默认 landing 仍要重新拉 skill library 和 snapshot 的问题

## 2. 目标

### 2.1 用户目标

- 页面硬刷新后，不再从完全空白状态重新起步
- 默认 `Skills` landing 能立即恢复上一次可见内容
- 已选项目的主要概览数据可立即恢复，再由后台异步纠正

### 2.2 工程目标

- 缓存必须是 `stale-while-revalidate`，不能阻断实时数据
- 缓存方案必须显式带版本、构建标识、TTL 与可清理策略
- 第一阶段不引入 Service Worker，不引入 IndexedDB，先用当前代码体系可控落地

### 2.3 非目标

- 不缓存日志流
- 不缓存 config 编辑草稿
- 不缓存 skill inline editor 内容
- 不缓存版本历史详情 / apply preview
- 不做离线可用承诺

## 3. 分阶段方案

## 3.1 Phase 1: Bootstrap 数据缓存

**状态**: 已完成

### 目标

解决“刷新后从头加载一遍”的首屏体感问题。

### 存储介质

使用 `localStorage`，原因：

- 现有代码已经在浏览器侧使用 `localStorage`
- Phase 1 的缓存体积可控
- 不需要引入 IndexedDB 的异步复杂度

### 缓存内容

仅缓存首屏恢复真正需要的内容：

- `projects`
- `selectedProjectId`
- `selectedMainTab`
- `selectedSkillFamilyId`
- `selectedRuntimeTab`
- `searchQuery`
- `sortBy` / `sortOrder`
- 当前选中项目的 `snapshot`
- `skillFamilies`
- 当前选中 family 的 `family detail + instances`

### 明确不缓存

- `allLogs`
- `providerHealth`
- `providerCatalog`
- `configByProject`
- `currentSkillVersion*`
- inline editor 当前文本
- 版本历史完整列表

### 数据结构

```ts
interface DashboardBootstrapCacheRecord {
  version: 1;
  buildId: string;
  cachedAt: string;
  ui: {
    selectedProjectId: string | null;
    selectedMainTab: 'skills' | 'project' | 'config';
    selectedSkillFamilyId: string | null;
    selectedRuntimeTab: 'all' | 'codex' | 'claude' | 'opencode';
    searchQuery: string;
    sortBy: 'name' | 'updated';
    sortOrder: 'asc' | 'desc';
  };
  projects: unknown[];
  selectedProjectSnapshot: {
    projectPath: string;
    snapshot: unknown;
  } | null;
  skillLibrary: {
    families: unknown[];
    selectedFamilyId: string | null;
    family: unknown | null;
    instances: unknown[];
  } | null;
}
```

### 启动策略

1. `init()` 最开始同步读取 bootstrap cache
2. 若命中有效缓存：
   - 先 hydrate `state`
   - 立即渲染 sidebar 与 main panel
3. 然后后台继续正常发起：
   - `/api/projects`
   - `/api/logs`
   - `loadSkillLibrary(true)`
   - `loadProjectSnapshot(..., { force: true })`
   - `connectSSE()`
4. 网络真值到达后，覆盖缓存态并重新保存

### 失效策略

满足任意条件即放弃缓存：

- `version` 不匹配
- `buildId` 不匹配
- `cachedAt` 超出 TTL
- `selectedProjectId` 不在缓存项目列表内
- `selectedSkillFamilyId` 不在缓存 family 列表内

建议 TTL：

- Phase 1 先使用 `30 min`

### 观测点

- `bootstrap cache hit`
- `bootstrap cache miss`
- `bootstrap cache invalidated`
- `bootstrap cache saved`

## 3.2 Phase 2: 静态资源缓存

**状态**: 已完成

### 目标

解决“每次刷新都重新下载和解析整份 app shell”的问题。

### 当前问题

现在 `/` 返回的是大块 HTML，并把脚本和样式内联在页面里。即使数据有缓存，浏览器仍会：

- 重新下载 HTML
- 重新解析整份脚本
- 重新解析整份样式

### 方案

- 将 dashboard JS/CSS 从 HTML 中拆出
- HTML 继续保持 `no-store`
- 静态资源路径使用内容哈希，而不是运行时 `buildId`
- `/assets/dashboard.<content-hash>.js` 与 `/assets/dashboard.<content-hash>.css` 设置：
  - `Cache-Control: public, max-age=31536000, immutable`

### 实现说明

- `buildId` 只保留在一个很小的 inline bootstrap script 里，用于运行时诊断与新旧前端构建检测
- 资源 URL 只在 JS/CSS 内容实际变化时才变化，因此 daemon 重启不会把浏览器缓存全部打穿
- 资源路由同时支持 `GET` / `HEAD`，便于本地直接用 `curl -I` 验证 header

### 预期收益

- 浏览器刷新时不再重复下载大块 app shell
- 解析成本下降
- build 切换时自动失效，不需要额外清理

## 3.3 Phase 3: 条件重验证

**状态**: 已完成

### 目标

减少每次 revalidate 都完整搬运较大 JSON。

### 方案

- 为 `/api/projects/:path/snapshot` 增加 `ETag`
- `ETag` 基于现有 `readProjectSnapshotVersion()` 生成
- 为 `/api/skills/families` 增加聚合签名与 `ETag`
- 为 `/api/skills/families/:familyId` 与 `/instances` 复用 family 粒度签名
- 前端请求带 `If-None-Match`
- 命中时返回 `304 Not Modified`

### 实现说明

- snapshot 路由会先计算版本签名，再决定是否直接返回 `304`，避免在命中缓存时继续读取完整 snapshot
- 实际写入响应头的是签名的固定长度哈希，而不是原始拼接串，避免大型技能库把 `ETag / If-None-Match` 头撑爆到 `431`
- 浏览器侧 `fetchJsonWithTimeout()` 现在维护一个轻量内存 HTTP cache：
  - 首次 `GET` 记录 `etag + data`
  - 后续自动带 `If-None-Match`
  - 命中 `304` 时直接复用旧 payload，不再抛错

### 预期收益

- 降低刷新后的重复传输
- 降低本地 CPU JSON parse 压力
- 为后续 IndexedDB / prefetch 打基础

## 4. 执行顺序

按以下顺序实施，不交叉开战线：

1. 文档与边界冻结
2. Phase 1 测试与实现
3. Phase 2 测试与实现
4. Phase 3 条件请求
5. 本地类型检查、构建、daemon 重启与真实页面验证

## 5. 测试策略

### Phase 1

- 单元测试：
  - cache record sanitize
  - buildId / TTL 失效
  - 选中项目 / family 缺失时自动回退
- UI 行为测试：
  - `init()` 在第一轮 await 前即可用缓存恢复 state
  - 后台网络成功后会覆盖缓存态
  - network fail 时仍能展示缓存态

### Phase 2

- server route test：
  - HTML 保持 `no-store`
  - 资源路由返回 immutable cache header
- UI source test：
  - HTML 引用外部资源
  - `buildId` 变更会切换资源 URL

### Phase 3

- route test：
  - `If-None-Match` 命中返回 `304`
  - 内容变化后返回新 `ETag`
- UI runtime test：
  - 第二次请求会自动附带 `If-None-Match`
  - `304` 时复用第一次请求得到的 JSON

## 6. 风险与约束

### 风险 1: 旧缓存覆盖用户正在操作的界面

应对：

- Phase 1 不缓存 editor / config draft / version history
- 缓存只用于 bootstrap，不作为权威数据源

### 风险 2: skill library 与 project snapshot 不一致

应对：

- 启动后始终异步 revalidate
- SSE 仍然保留现有变更驱动刷新逻辑

## 7. 本轮落地结果

- 已实现 Phase 1 bootstrap cache，刷新后可先用本地缓存恢复 `Skills` landing、选中项目和关键 UI 状态
- 已实现 Phase 2 静态资源缓存，HTML shell 与可长期缓存的 JS/CSS 资源完成拆分
- 已实现 Phase 3 `ETag/304`，大 JSON 接口支持条件重验证，前端可复用旧 payload
- 本轮验证链路包括：
  - 单测：cache/bootstrap/asset/etag 相关定向测试
  - `npm run typecheck`
  - `npm run build`
  - daemon 重启后的真实页面与响应头检查

### 风险 3: localStorage 容量被逐步吃满

应对：

- Phase 1 只缓存一个项目 snapshot 和一个 family detail
- 后续如果扩容，再迁移到 IndexedDB

## 7. 当前执行决策

本轮按以下范围执行：

1. 新增本方案文档
2. 落地 Phase 1 bootstrap 数据缓存
3. 补对应失败测试、通过测试
4. 保持日志与失效策略可观察

Phase 2 与 Phase 3 保持在文档中，但不与 Phase 1 混做。

## 8. 启动验证笔记

本轮实施过程中确认：

- 修改 dashboard 前端源码后，仅 `npm run build` 不会让当前运行中的 daemon/dashboard 进程自动切到新 build
- 需要显式执行 `ornn restart`
- 可用 `/api/dashboard/runtime` 返回的 `buildId` 与 `pid` 确认当前运行实例是否已切换

推荐验证顺序：

1. `npm run build`
2. `ornn restart`
3. `curl http://localhost:47432/api/dashboard/runtime`
4. 确认 HTML 中已包含新的 bootstrap cache source
