# darwin-skill 对比记录

## 样本信息

- 外部项目: `https://github.com/alchaincyf/darwin-skill`
- 本地探索副本: `.external/darwin-skill/`
- 探索时 HEAD: `9f4dced`
- 当前仓库对该目录的处理: 由 `.gitignore` 忽略，不纳入版本控制

## 一句话结论

`darwin-skill` 是一个“单 Skill 形态的优化方法论产品”；`OrnnSkills` 是一个“可运行的 CLI + daemon + shadow registry 系统”。两者目标相近，落地层级不同，并不是直接同类实现。

## 定位差异

### darwin-skill

- 交付物是一个 `SKILL.md`
- 主要通过 Skill 指令驱动 Agent 执行“评估 -> 改进 -> 重评 -> 保留/回滚”
- 强调单一资产优化、双重评估、git ratchet、人在回路
- 更像“优化框架/操作手册/工作流模板”

### OrnnSkills

- 交付物是一个 Node.js CLI 工具和后台守护进程
- 主要通过运行时 trace 观察、shadow copy、LLM 分析、patch 生成、评估与部署来持续优化
- 强调多项目注册、后台运行、技能影子副本、自动化演进与回滚
- 更像“技能优化基础设施/平台型实现”

## 核心对比

| 维度 | darwin-skill | OrnnSkills |
| --- | --- | --- |
| 分发形态 | 单仓库 Skill 资产 | npm CLI + daemon |
| 运行入口 | Agent 触发 Skill | `ornn` 命令与后台进程 |
| 优化对象 | 单个 `SKILL.md` | 每项目 shadow skills |
| 观测来源 | 人工挑选的 test prompts | 实际运行 trace + session 数据 |
| 评估方式 | 8 维 rubric + with/without skill 对比 | analyzer/evaluator/pipeline 组合 |
| 回滚机制 | `keep / revert` 的显式 git ratchet | journal/snapshot/shadow rollback |
| 人工介入 | 每阶段都强调确认 | 有 `user-confirmation` 模块，但整体更偏自动化 |
| 输出表达 | 分数、diff、成果卡片 | 状态、日志、diff、dashboard、shadow 状态 |
| 适用场景 | 快速审查和手动优化少量 skills | 长期运行、跨项目、持续优化 |

## darwin-skill 值得借鉴的点

1. 产品叙事更聚焦。它把“像训练模型一样优化 skill”讲得非常直观，传播成本低。
2. 评分框架更显性。8 维 rubric、权重、结果表结构都对用户透明，便于理解“为什么这个 skill 被判定为更好”。
3. 人在回路的检查点设计更强。每个阶段暂停确认，降低自动化修改带来的不确定感。
4. 对比展示更强。README 里反复强调 baseline 对照、分数变化、成果卡片，这些都很适合用作 OrnnSkills 的解释层。

## OrnnSkills 明显更强的点

1. 系统边界更完整。已经具备 observer、mapper、pipeline、shadow registry、journal、deployer、dashboard 等模块，不依赖纯人工流程。
2. 数据来源更真实。不是只靠设计测试 prompt，而是直接利用真实 Agent 运行轨迹。
3. 更适合持续运行。`ornn init/start/status/skills *` 形成了完整生命周期，而不是一次性 Skill 执行。
4. 多项目能力更强。面向 project registry 和全局 daemon，不局限于单仓库、单 skill。

## 对当前项目的启发

1. 可以补一个“显式评分说明层”。
当前项目内部已有 analyzer/evaluator，但用户侧缺少像 `darwin-skill` 那样一眼能懂的评分维度、权重和保留规则。

2. 可以补一个“基线对照模式”。
除了真实 trace 驱动，增加一个可选的 test-prompt 基线评估模式，会让新技能或冷启动项目更容易验证。

3. 可以补一个“结果展示层”。
`darwin-skill` 的结果卡片、阶段图和分数卡对外展示非常强，OrnnSkills 可以借鉴成 dashboard 或 `ornn skills preview/report` 输出。

4. 可以强化“人类确认节点”的产品表达。
当前项目从模块设计上已经考虑了确认流，但在 README 与用户心智里，这部分没有 `darwin-skill` 清楚。

## 不建议直接照搬的点

1. 不建议把 OrnnSkills 收缩成单 Skill 工作流。
这会丢掉当前项目最有价值的基础设施能力。

2. 不建议完全依赖人工设计的测试 prompts。
这适合展示和实验，不适合作为长期唯一数据源。

3. 不建议把 git ratchet 直接等同于系统级回滚。
当前项目已经有 shadow/journal/snapshot 语义，应该保持系统内回滚能力，再按需映射到 git。

## 当前判断

如果把两者放在一张路线图上看：

- `darwin-skill` 更像是 OrnnSkills 的“产品叙事层 + 显式评估层 + 演示层”
- `OrnnSkills` 更像是把这套理念做成长期可运行系统的“执行层 + 数据层 + 基建层”

因此更合理的方向不是“二选一”，而是把 `darwin-skill` 的表达优势吸收到 OrnnSkills 上层，而保持 OrnnSkills 的系统架构不变。
