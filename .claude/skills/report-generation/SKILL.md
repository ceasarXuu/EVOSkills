---
name: report-generation
description: 自动化报告生成技能,使用现有模板自动填充研究数据,生成专业的 Markdown 格式报告
---

# 自动化报告生成技能

## 概述

本技能提供标准化的报告生成流程,确保研究成果以清晰、专业的方式呈现。

## 核心能力

1. **模板选择**: 根据研究类型选择合适的模板
2. **数据填充**: 自动从数据库提取数据填充模板
3. **格式优化**: 确保 Markdown 格式规范
4. **引用管理**: 正确标注数据来源

## 可用模板

### 1. 探索性研究报告
**文件**: `docs/报告模板/Research Report: Exploration.md`
**适用场景**: 没有明确方向,广泛探索市场机会
**包含章节**:
- 研究背景和目标
- 研究方法和信源
- 痛点发现
- 市场机会识别
- 初步竞品扫描
- 下一步建议

### 2. 定向研究报告
**文件**: `docs/报告模板/Research Report: With a Themed Topic.md`
**适用场景**: 已有明确的产品方向,需要深度验证
**包含章节**:
- 执行摘要
- 痛点深度分析
- 市场规模估算 (TAM/SAM/SOM)
- 竞品深度分析
- 可行性评估
- MVP 定义
- 验证路径
- 风险分析

## 报告生成流程

### 步骤 1: 选择模板
```
根据研究类型选择:
- 探索性研究 → Exploration 模板
- 定向研究 → Themed Topic 模板
- 竞品分析 → 自定义竞品报告模板
```

### 步骤 2: 收集数据
从 SQLite 数据库提取:
```sql
-- 痛点数据
SELECT category, COUNT(*) as count
FROM user_quotes
GROUP BY category
ORDER BY count DESC;

-- 用户原话样本
SELECT quote, source, upvotes
FROM user_quotes
WHERE category = '[痛点类别]'
ORDER BY upvotes DESC
LIMIT 5;

-- 竞品数据
SELECT * FROM competitors;

-- 市场数据
SELECT * FROM market_sizing;
```

### 步骤 3: 填充模板

**执行摘要示例**:
```markdown
## 执行摘要

**研究主题**: [从研究目标提取]

**核心发现**:
1. [从痛点聚类提取 Top 1]
2. [从痛点聚类提取 Top 2]
3. [从痛点聚类提取 Top 3]

**市场规模**:
- TAM: $[从 market_sizing 表提取]
- SAM: $[从 market_sizing 表提取]
- SOM (Year 1): $[从 market_sizing 表提取]

**建议**: [Go/No-Go] - [简要理由]
```

**痛点分析示例**:
```markdown
## 痛点分析

### 1. [痛点类别 1]

**严重程度**: ⭐⭐⭐⭐⭐ ([频率] × [强度] × [付费意愿] = [总分])

**提及频率**: [count] 次 ([percentage]%)

**典型用户原话**:
> "[quote 1]" - [source 1]

> "[quote 2]" - [source 2]

**验证来源**:
- Reddit: [链接]
- X.com: [链接]
- App Store: [链接]
```

### 步骤 4: 添加可视化

**表格**:
```markdown
| 痛点 | 频率 | 严重程度 | 付费意愿 | 总分 |
|------|------|---------|---------|------|
| [数据] | [数据] | [数据] | [数据] | [数据] |
```

**图表** (使用 Mermaid):
```markdown
```mermaid
pie title 痛点分布
    "[类别1]" : [数值1]
    "[类别2]" : [数值2]
    "[类别3]" : [数值3]
\```
```

### 步骤 5: 引用和来源

**数据来源章节**:
```markdown
## 数据来源

### 一手数据
- Reddit r/iPhone: 45 条讨论, 2024-07 至 2025-01
- X.com: 120 条推文, 2024-09 至 2025-01
- App Store 评论: 80 条评论, 2024-10 至 2025-01

### 二手数据
- Sensor Tower: 竞品下载量估算
- Statista: iPhone 用户基数
- App Annie: 市场份额数据

### 参考链接
1. [标题] - [URL]
2. [标题] - [URL]
```

## 报告质量检查清单

### 内容完整性
- [ ] 执行摘要清晰简洁
- [ ] 研究方法明确
- [ ] 痛点分析有数据支撑
- [ ] 市场规模有计算过程
- [ ] 竞品分析有对比表格
- [ ] 建议具体可执行
- [ ] 数据来源完整标注

### 格式规范
- [ ] Markdown 语法正确
- [ ] 标题层级清晰 (H1 > H2 > H3)
- [ ] 表格对齐
- [ ] 列表格式统一
- [ ] 链接有效
- [ ] 代码块有语言标注

### 数据质量
- [ ] 数字准确无误
- [ ] 计算逻辑清晰
- [ ] 引用来源可追溯
- [ ] 时间范围明确
- [ ] 假设条件说明

### 可读性
- [ ] 语言简洁专业
- [ ] 逻辑连贯
- [ ] 重点突出
- [ ] 避免行话
- [ ] 适当使用可视化

## 报告模板结构

### 完整报告大纲
```markdown
# [产品名称] 商业机会研究报告

## 1. 执行摘要
- 研究主题
- 核心发现 (3-5 条)
- 市场规模
- 建议 (Go/No-Go)

## 2. 研究背景
- 研究目标
- 研究范围
- 时间线

## 3. 研究方法
- 信源选择
- 数据收集方法
- 分析框架

## 4. 痛点分析
- 痛点聚类结果
- Top 3 痛点详细分析
- 用户原话样本
- 三角验证

## 5. 市场分析
- TAM/SAM/SOM 计算
- 目标用户画像
- 市场趋势
- 增长预测

## 6. 竞品分析
- 竞品识别和分层
- 功能对比矩阵
- 定价策略分析
- 用户反馈对比
- Gap 识别

## 7. 可行性评估
- 技术可行性
- 财务模型 (Unit Economics)
- 风险评估
- JTBD 分析

## 8. 机会评估
- 多维度评分
- SWOT 分析
- Porter 五力分析

## 9. MVP 定义
- 核心功能
- 排除功能
- 开发时间估算
- 资源需求

## 10. 验证路径
- 关键假设
- 验证实验设计
- 成功指标
- 失败退出条件

## 11. 下一步行动
- 12 周路线图
- 资源分配
- 里程碑

## 12. 附录
- 数据来源
- 详细计算
- 用户原话完整列表
- 竞品详细信息
```

## 自动化脚本示例

### 生成痛点章节
```python
# 伪代码示例
def generate_pain_section(db_connection):
    # 查询痛点数据
    pains = db.query("""
        SELECT category, COUNT(*) as count, 
               AVG(upvotes) as avg_upvotes
        FROM user_quotes
        GROUP BY category
        ORDER BY count DESC
        LIMIT 5
    """)
    
    # 生成 Markdown
    markdown = "## 痛点分析\n\n"
    
    for i, pain in enumerate(pains, 1):
        markdown += f"### {i}. {pain['category']}\n\n"
        markdown += f"**提及频率**: {pain['count']} 次\n\n"
        
        # 获取样本
        samples = db.query(f"""
            SELECT quote, source
            FROM user_quotes
            WHERE category = '{pain['category']}'
            ORDER BY upvotes DESC
            LIMIT 3
        """)
        
        markdown += "**典型用户原话**:\n"
        for sample in samples:
            markdown += f"> \"{sample['quote']}\" - {sample['source']}\n\n"
    
    return markdown
```

## 报告发布

### 文件命名规范
```
格式: [日期]_[产品类别]_[报告类型].md
示例: 2025-01-15_ios_battery_tool_research_report.md
```

### 存储位置
```
research_output/
├── 2025-01-15_ios_battery_tool/
│   ├── final_report.md
│   ├── data_analysis.md
│   ├── competitor_analysis.md
│   └── mvp_spec.md
```

### 版本控制
```
使用 Git 管理报告版本:
- 初稿: v0.1
- 评审后: v0.2
- 最终版: v1.0
```

## 报告优化技巧

### 1. 使用视觉层次
```markdown
# 一级标题 - 报告标题
## 二级标题 - 主要章节
### 三级标题 - 子章节
**粗体** - 强调关键点
*斜体* - 次要强调
> 引用 - 用户原话
```

### 2. 数据可视化
- 表格: 对比数据
- 柱状图: 频率分布
- 饼图: 占比分析
- 折线图: 趋势变化
- 矩阵: 多维评估

### 3. 突出关键信息
```markdown
> [!IMPORTANT]
> 核心发现: 电池焦虑是最严重的痛点,提及率 38%

> [!WARNING]
> 风险提示: Apple 可能在 iOS 19 中内置类似功能
```

### 4. 提供可执行建议
```markdown
❌ 不好: "应该关注用户体验"
✅ 好: "在 MVP 中优先实现一键优化功能,预计开发时间 2 周"
```

## 常见问题

### Q: 报告太长怎么办?
A: 
- 执行摘要控制在 1 页
- 详细分析放在附录
- 使用折叠章节 (如果支持)

### Q: 数据不够怎么办?
A:
- 明确标注数据限制
- 使用保守估算
- 说明需要进一步验证

### Q: 如何处理不确定性?
A:
- 使用范围而非单一数值
- 提供多个场景
- 明确假设条件

## 输出示例

查看 `docs/报告模板/` 目录中的完整示例。
