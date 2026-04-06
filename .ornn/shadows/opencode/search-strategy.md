---
name: search-strategy
description: 用四阶段搜索策略与高级运算符设计和迭代检索查询，适用于在调研中发现未知痛点、验证痛点广度与深度、捕捉负面情绪与Excel替代信号。
---

# 检索策略与查询优化

## Overview
用分阶段搜索与迭代查询，快速发现真实痛点并定位可行动的机会。

## Workflow
1. 选择目标人群/任务并定义初始关键词
2. 按四阶段策略生成查询并执行检索
3. 记录高价值用户原话与重复出现的表述
4. 基于结果迭代查询，缩小到可验证痛点
5. 输出查询清单与高信号结果摘要

## 四阶段搜索策略
### Stage 1 广泛探索
- 目标: 发现unknown unknowns
- 模式: "[job role] + pain + app", "iOS frustration" site:reddit.com

### Stage 2 痛点深挖
- 目标: 验证痛点广度与深度
- 模式: 使用长尾与具体数值表达

### Stage 3 负面情绪检索
- 目标: 捕捉最真实的愤怒与替代意愿
- 模式: site:reddit.com "I hate" + [task]

### Stage 4 Excel替代检索
- 目标: 识别现有App未解决的结构化需求
- 模式: "[role] spreadsheet template" / "Excel template for [task]"

## 高级运算符
- Site限定: site:reddit.com / site:x.com / site:producthunt.com
- 时间限定: 过去1年
- 排除噪声: keyword -repair -replacement
- 精确匹配: "exact phrase"(谨慎使用)

## Output
- 查询清单与迭代记录
- 用户原话摘录与对应链接
- 初步痛点列表与证据来源

## Guardrails
- 避免媒体榜单类关键词
- 使用用户自然语言而非技术术语
- 每轮查询都记录“为何有效/无效”
