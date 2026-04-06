---
name: sentiment-analysis
description: 情感分析技能,分析用户评论情感倾向,评估痛点严重程度,提取关键词和主题
---

# 情感分析技能

## 概述

通过分析用户评论和讨论的情感倾向,量化用户满意度和痛点严重程度。

## 核心能力

1. **情感分类**: 正面/中性/负面
2. **情感强度评估**: 量化情感程度
3. **痛点严重程度**: 评估用户frustration 程度
4. **关键词提取**: 识别高频词汇和主题

## 情感分类方法

### 1. 基于关键词的简单分类

**正面关键词**:
```
love, great, awesome, perfect, excellent, amazing, 
fantastic, wonderful, best, recommend, helpful, 
easy, simple, fast, smooth, reliable
```

**负面关键词**:
```
hate, terrible, awful, worst, horrible, useless,
disappointing, frustrating, annoying, slow, buggy,
crash, broken, waste, regret, avoid
```

**强度词**:
```
very, extremely, absolutely, completely, totally,
really, so, too, incredibly, unbelievably
```

**SQL 实现**:
```sql
-- 简单情感分类
SELECT 
  id,
  quote,
  CASE 
    WHEN LOWER(quote) LIKE '%love%' OR LOWER(quote) LIKE '%great%' 
      OR LOWER(quote) LIKE '%awesome%' OR LOWER(quote) LIKE '%perfect%'
      THEN 'positive'
    WHEN LOWER(quote) LIKE '%hate%' OR LOWER(quote) LIKE '%terrible%' 
      OR LOWER(quote) LIKE '%awful%' OR LOWER(quote) LIKE '%worst%'
      THEN 'negative'
    ELSE 'neutral'
  END as sentiment,
  CASE
    WHEN LOWER(quote) LIKE '%very%' OR LOWER(quote) LIKE '%extremely%'
      THEN 'high'
    ELSE 'medium'
  END as intensity
FROM user_quotes;
```

### 2. 评分规则

**情感评分** (-5 到 +5):
```
计算方法:
1. 统计正面关键词数量 (P)
2. 统计负面关键词数量 (N)
3. 统计强度词数量 (I)
4. 评分 = (P - N) × (1 + I × 0.5)

示例:
"I absolutely love this app!" 
- P = 1 (love)
- N = 0
- I = 1 (absolutely)
- 评分 = (1 - 0) × (1 + 1 × 0.5) = 1.5

"This is the worst app ever!"
- P = 0
- N = 1 (worst)
- I = 0
- 评分 = (0 - 1) × (1 + 0) = -1
```

## 痛点严重程度评估

### 评估维度

1. **情感强度**: 用户的愤怒/失望程度
2. **频率**: 多少人提到
3. **持续性**: 问题存在多久
4. **影响范围**: 影响多少用户

### 严重程度矩阵

```markdown
| 痛点 | 情感强度 | 频率 | 持续性 | 影响范围 | 总分 | 等级 |
|------|---------|------|--------|---------|------|------|
| 电池焦虑 | -4.2 | 45 | 6个月 | 广泛 | 18 | 严重 |
| 存储满 | -3.8 | 32 | 12个月 | 广泛 | 16 | 严重 |
| 通知多 | -2.5 | 18 | 3个月 | 中等 | 8 | 中等 |
```

**评分标准**:
- 严重 (15-20): 立即解决
- 中等 (10-14): 优先考虑
- 轻微 (5-9): 可以延后
- 忽略 (<5): 不值得投入

### SQL 查询

```sql
-- 痛点严重程度分析
SELECT 
  category,
  COUNT(*) as frequency,
  AVG(sentiment_score) as avg_sentiment,
  DATEDIFF(MAX(created_at), MIN(created_at)) as duration_days,
  COUNT(DISTINCT source) as source_diversity,
  -- 综合评分
  (COUNT(*) * 0.3 + 
   ABS(AVG(sentiment_score)) * 2 + 
   DATEDIFF(MAX(created_at), MIN(created_at)) / 30 * 0.5 +
   COUNT(DISTINCT source) * 0.5) as severity_score
FROM user_quotes
WHERE sentiment_score < 0  -- 只看负面
GROUP BY category
ORDER BY severity_score DESC;
```

## 关键词提取

### 1. 高频词统计

**方法**:
```
1. 分词 (去除停用词)
2. 统计词频
3. 按频率排序
4. 提取 Top 20-30
```

**停用词列表**:
```
the, a, an, and, or, but, in, on, at, to, for, 
of, with, by, from, is, are, was, were, be, been
```

**SQL 实现** (简化版):
```sql
-- 提取包含特定词的评论数
SELECT 
  'battery' as keyword,
  COUNT(*) as mention_count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_quotes) as percentage
FROM user_quotes
WHERE LOWER(quote) LIKE '%battery%'

UNION ALL

SELECT 
  'storage' as keyword,
  COUNT(*) as mention_count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_quotes) as percentage
FROM user_quotes
WHERE LOWER(quote) LIKE '%storage%';
```

### 2. 主题聚类

**常见主题**:
- 性能问题: slow, lag, freeze, crash
- 功能缺失: missing, need, want, wish
- 用户体验: confusing, complicated, difficult
- 价格: expensive, overpriced, not worth
- Bug: bug, error, broken, not working

**主题分类**:
```sql
SELECT 
  CASE
    WHEN LOWER(quote) LIKE '%slow%' OR LOWER(quote) LIKE '%lag%' 
      OR LOWER(quote) LIKE '%crash%'
      THEN 'performance'
    WHEN LOWER(quote) LIKE '%missing%' OR LOWER(quote) LIKE '%need%'
      OR LOWER(quote) LIKE '%want%'
      THEN 'feature_request'
    WHEN LOWER(quote) LIKE '%confusing%' OR LOWER(quote) LIKE '%complicated%'
      THEN 'ux_issue'
    WHEN LOWER(quote) LIKE '%expensive%' OR LOWER(quote) LIKE '%price%'
      THEN 'pricing'
    WHEN LOWER(quote) LIKE '%bug%' OR LOWER(quote) LIKE '%broken%'
      THEN 'bug'
    ELSE 'other'
  END as theme,
  COUNT(*) as count
FROM user_quotes
GROUP BY theme
ORDER BY count DESC;
```

## 竞品情感对比

### 对比分析

```markdown
| 竞品 | 平均情感 | 正面% | 中性% | 负面% | 主要抱怨 |
|------|---------|-------|-------|-------|---------|
| A    | +1.2    | 45%   | 35%   | 20%   | 价格贵 |
| B    | -0.5    | 25%   | 40%   | 35%   | 功能少 |
| C    | +2.1    | 60%   | 30%   | 10%   | 无 |
```

**SQL 查询**:
```sql
SELECT 
  competitor_name,
  AVG(sentiment_score) as avg_sentiment,
  SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as positive_pct,
  SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as neutral_pct,
  SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as negative_pct
FROM app_reviews
GROUP BY competitor_name
ORDER BY avg_sentiment DESC;
```

## 时间序列情感分析

### 情感趋势

```sql
-- 月度情感趋势
SELECT 
  strftime('%Y-%m', created_at) as month,
  AVG(sentiment_score) as avg_sentiment,
  COUNT(*) as review_count
FROM user_quotes
GROUP BY month
ORDER BY month;
```

**可视化**:
```
月份:  01   02   03   04   05   06
情感: +1.2 +0.8 -0.5 -1.2 -1.5 -1.8  (趋势恶化)
```

### 事件影响

```markdown
## iOS 18 发布对情感的影响

**发布前 (2024-08)**:
- 平均情感: +0.5
- 负面评论: 25%

**发布后 (2024-10)**:
- 平均情感: -1.2
- 负面评论: 45%

**变化**: 情感显著恶化,负面评论增加 80%
```

## 情感分析报告模板

```markdown
# [主题] 情感分析报告

## 概况
- 分析时间: [时间范围]
- 数据量: X 条评论/讨论
- 数据来源: [列表]

## 整体情感分布
| 情感 | 数量 | 占比 |
|------|------|------|
| 正面 | X    | XX%  |
| 中性 | X    | XX%  |
| 负面 | X    | XX%  |

**平均情感评分**: X.X (-5 到 +5)

## 痛点严重程度排名
1. [痛点1] - 严重程度: XX/20
2. [痛点2] - 严重程度: XX/20
3. [痛点3] - 严重程度: XX/20

## 高频关键词
### 正面
1. [词1] - 提及 X 次
2. [词2] - 提及 X 次

### 负面
1. [词1] - 提及 X 次
2. [词2] - 提及 X 次

## 主题分布
| 主题 | 数量 | 占比 | 平均情感 |
|------|------|------|---------|
| [主题1] | X | XX% | X.X |

## 竞品对比
[竞品情感对比表]

## 时间趋势
[情感趋势图]

## 典型评论样本
### 最正面
> "[引用]"

### 最负面
> "[引用]"

## 洞察与建议
1. [基于情感分析的洞察]
2. [建议]
```

## 数据库结构

```sql
-- 情感分析结果表
CREATE TABLE sentiment_analysis (
  id INTEGER PRIMARY KEY,
  quote_id INTEGER,
  sentiment TEXT,  -- positive/neutral/negative
  sentiment_score REAL,  -- -5 to +5
  intensity TEXT,  -- low/medium/high
  theme TEXT,
  keywords TEXT,  -- JSON array
  analyzed_at TEXT,
  FOREIGN KEY (quote_id) REFERENCES user_quotes(id)
);

-- 关键词频率表
CREATE TABLE keyword_frequency (
  id INTEGER PRIMARY KEY,
  keyword TEXT,
  category TEXT,
  frequency INTEGER,
  sentiment_association TEXT,  -- positive/negative
  last_updated TEXT
);
```

## 最佳实践

1. **人工验证**: 自动分类需要抽样验证准确性
2. **上下文理解**: 讽刺和反语需要特殊处理
3. **多语言支持**: 不同语言的情感表达不同
4. **持续更新**: 关键词列表需要定期更新
5. **结合定量**: 情感分析要结合其他数据

## 局限性

1. **讽刺检测**: 难以识别反讽
2. **上下文依赖**: 单词情感取决于上下文
3. **文化差异**: 不同文化的情感表达不同
4. **简化处理**: 基于关键词的方法较简单

## 改进方向

1. **使用 AI 模型**: 更准确的情感分类
2. **方面级情感**: 针对不同功能的情感
3. **情感原因**: 为什么正面/负面
4. **情感演变**: 用户情感如何变化

## 输出清单

- [ ] 情感分类已完成
- [ ] 痛点严重程度已评估
- [ ] 关键词已提取
- [ ] 主题已聚类
- [ ] 竞品对比已完成
- [ ] 时间趋势已分析
- [ ] 情感分析报告已生成
