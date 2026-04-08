---
name: trend-analysis
description: 趋势分析技能,分析 Google Trends 数据、社交媒体热度、季节性模式,预测市场趋势
---

# 趋势分析技能

## 概述

识别和分析市场趋势,帮助判断产品机会的时机和持续性。

## 核心能力

1. **搜索趋势分析**: Google Trends 数据解读
2. **社交媒体热度追踪**: Reddit、X.com 讨论量变化
3. **季节性模式识别**: 发现周期性波动
4. **趋势预测**: 基于历史数据预测未来

## 数据来源

### 1. Google Trends
**获取方式**: 
- 访问 https://trends.google.com
- 输入关键词
- 选择地区和时间范围
- 导出 CSV 数据

**关键指标**:
- 搜索热度 (0-100)
- 相关查询
- 地区分布
- 时间趋势

### 2. 社交媒体
**Reddit**:
- 帖子数量
- Upvotes 总数
- 评论活跃度

**X.com**:
- 推文数量
- 转发和点赞
- 话题标签热度

### 3. App Store
- 关键词搜索结果数
- 相关 App 数量
- 类别排名变化

## 分析方法

### 1. 搜索趋势分析

**步骤**:
```
1. 确定核心关键词
   - 主关键词: "battery health"
   - 相关关键词: "battery anxiety", "battery optimization"

2. 收集 Google Trends 数据
   - 时间范围: 最近 12-24 个月
   - 地区: 目标市场 (如美国、中国)

3. 分析趋势方向
   - 上升趋势: 需求增长,机会增大
   - 下降趋势: 需求减少,谨慎进入
   - 平稳趋势: 稳定需求,竞争可能激烈
   - 波动趋势: 季节性或事件驱动

4. 识别拐点
   - 突然上升: 发生了什么事件?
   - 突然下降: 问题被解决了吗?
```

**示例分析**:
```markdown
### "iOS battery anxiety" 搜索趋势

**时间范围**: 2024-01 至 2025-01

**趋势方向**: 上升 (+35%)

**关键观察**:
- 2024-09: 搜索量激增 (iOS 18 发布)
- 2024-12: 持续高位 (问题未解决)
- 2025-01: 略有下降但仍高于年初

**结论**: 
- 痛点真实且持续存在
- iOS 18 加剧了问题
- 市场需求强劲

**相关查询**:
1. "battery health 96% normal" - 上升 150%
2. "ios 18 battery drain" - 上升 200%
3. "battery replacement cost" - 上升 80%
```

### 2. 社交媒体热度分析

**Reddit 分析**:
```sql
-- 月度帖子数趋势
SELECT 
  strftime('%Y-%m', created_at) as month,
  COUNT(*) as post_count,
  SUM(upvotes) as total_upvotes,
  AVG(comment_count) as avg_comments
FROM reddit_posts
WHERE subreddit = 'iPhone'
  AND title LIKE '%battery%'
GROUP BY month
ORDER BY month;
```

**X.com 分析**:
```sql
-- 周度推文量趋势
SELECT 
  strftime('%Y-W%W', created_at) as week,
  COUNT(*) as tweet_count,
  SUM(likes) as total_likes,
  SUM(retweets) as total_retweets
FROM tweets
WHERE content LIKE '%battery anxiety%'
GROUP BY week
ORDER BY week DESC
LIMIT 12;
```

**热度评分**:
```
热度分数 = (帖子数 × 1) + (Upvotes × 0.1) + (评论数 × 0.5)

分级:
- 低热度: < 100
- 中热度: 100-500
- 高热度: 500-1000
- 极高热度: > 1000
```

### 3. 季节性模式识别

**方法**:
```
1. 收集至少 12 个月的数据
2. 按月份聚合
3. 识别重复模式

示例:
- 1月: 新年新手机,电池关注度高
- 9月: iPhone 新品发布,关注度激增
- 12月: 假期购物季,关注度上升
```

**SQL 查询**:
```sql
-- 按月份统计 (跨年度)
SELECT 
  CAST(strftime('%m', created_at) AS INTEGER) as month,
  AVG(monthly_count) as avg_count
FROM (
  SELECT 
    strftime('%Y-%m', created_at) as year_month,
    strftime('%m', created_at) as month,
    COUNT(*) as monthly_count
  FROM user_quotes
  GROUP BY year_month
)
GROUP BY month
ORDER BY month;
```

**可视化**:
```
月份:  1   2   3   4   5   6   7   8   9  10  11  12
热度: ███ ██  ██  ██  ██  ██  ██  ██ ████ ███ ███ ████
```

### 4. 趋势预测

**简单预测方法**:
```
线性趋势:
- 如果过去 6 个月平均增长 10%/月
- 预测下个月: 当前值 × 1.10

移动平均:
- 3 个月移动平均: (M1 + M2 + M3) / 3
- 用于平滑波动

增长率预测:
- 计算月度增长率
- 取平均值
- 应用到未来月份
```

**SQL 实现**:
```sql
-- 计算月度增长率
WITH monthly_data AS (
  SELECT 
    strftime('%Y-%m', created_at) as month,
    COUNT(*) as count
  FROM user_quotes
  GROUP BY month
  ORDER BY month
)
SELECT 
  a.month,
  a.count as current_count,
  b.count as previous_count,
  (a.count - b.count) * 100.0 / b.count as growth_rate
FROM monthly_data a
LEFT JOIN monthly_data b ON 
  DATE(a.month || '-01', '-1 month') = DATE(b.month || '-01')
WHERE b.count IS NOT NULL;
```

## 趋势类型

### 1. 上升趋势
**特征**:
- 搜索量持续增长
- 社交讨论增加
- 新竞品进入

**机会**:
- 市场需求增长
- 早期进入优势
- 增长红利

**风险**:
- 竞争加剧
- 可能是短期炒作

### 2. 下降趋势
**特征**:
- 搜索量下降
- 讨论热度降低
- 竞品退出

**机会**:
- 竞争减少
- 可能被忽视的细分市场

**风险**:
- 需求萎缩
- 问题已被解决

### 3. 平稳趋势
**特征**:
- 搜索量稳定
- 持续的讨论
- 成熟市场

**机会**:
- 稳定需求
- 可预测性高

**风险**:
- 竞争激烈
- 难以差异化

### 4. 波动趋势
**特征**:
- 周期性变化
- 事件驱动

**机会**:
- 在高峰期推广
- 预测性优势

**风险**:
- 收入不稳定
- 需要灵活应对

## 事件影响分析

### 识别关键事件
```
事件类型:
1. 产品发布 (iOS 18)
2. 媒体报道 (科技新闻)
3. 病毒内容 (热门视频/帖子)
4. 竞品动态 (新 App 发布)
5. 政策变化 (App Store 规则)
```

### 事件影响评估
```markdown
## iOS 18 发布对电池焦虑的影响

**事件时间**: 2024-09-16

**数据对比**:
| 指标 | 发布前 (8月) | 发布后 (10月) | 变化 |
|------|-------------|--------------|------|
| Google 搜索 | 65 | 92 | +42% |
| Reddit 帖子 | 12 | 35 | +192% |
| X.com 推文 | 45 | 120 | +167% |

**结论**:
- iOS 18 显著加剧了电池焦虑
- 问题在发布后 2 个月仍未解决
- 市场需求被验证
```

## 竞争趋势分析

### 竞品进入/退出追踪
```sql
CREATE TABLE market_entries (
  id INTEGER PRIMARY KEY,
  app_name TEXT,
  entry_date TEXT,
  exit_date TEXT,
  reason TEXT
);

-- 分析市场活跃度
SELECT 
  strftime('%Y-%m', entry_date) as month,
  COUNT(*) as new_entries
FROM market_entries
WHERE exit_date IS NULL
GROUP BY month;
```

### 市场集中度分析
```
HHI (Herfindahl-Hirschman Index):
= Σ(市场份额²)

解读:
- HHI < 1500: 竞争激烈
- HHI 1500-2500: 中等集中
- HHI > 2500: 高度集中
```

## 趋势报告模板

```markdown
# [主题] 趋势分析报告

## 执行摘要
- 分析时间: [时间范围]
- 核心发现: [3-5 个关键洞察]
- 趋势方向: 上升/下降/平稳/波动

## 搜索趋势
### Google Trends
- 主关键词趋势: [图表]
- 相关查询: [列表]
- 地区分布: [表格]

## 社交媒体热度
### Reddit
- 帖子数趋势: [图表]
- 热门讨论: [样本]

### X.com
- 推文量趋势: [图表]
- 话题标签: [列表]

## 季节性分析
- 高峰月份: [月份]
- 低谷月份: [月份]
- 模式解释: [原因]

## 事件影响
- 关键事件: [列表]
- 影响分析: [详细]

## 竞争趋势
- 新进入者: [数量]
- 退出者: [数量]
- 市场集中度: [HHI]

## 预测
- 未来 3 个月: [预测]
- 未来 6 个月: [预测]
- 不确定性: [风险]

## 建议
1. [基于趋势的具体建议]
2. [建议 2]
```

## 工具使用

### Google Trends
```
1. 访问 trends.google.com
2. 输入关键词
3. 设置:
   - 地区: 目标市场
   - 时间: 过去 12 个月
   - 类别: 相关类别
4. 导出 CSV
5. 导入到 SQLite 分析
```

### 数据存储
```sql
CREATE TABLE trend_data (
  id INTEGER PRIMARY KEY,
  keyword TEXT,
  date TEXT,
  search_volume INTEGER,
  source TEXT
);
```

## 最佳实践

1. **多维度验证**: 不要只看单一数据源
2. **长期追踪**: 至少 12 个月数据
3. **上下文理解**: 趋势背后的原因
4. **定期更新**: 每月刷新数据
5. **行动导向**: 趋势分析要指导决策

## 输出清单

- [ ] Google Trends 数据已收集
- [ ] 社交媒体热度已分析
- [ ] 季节性模式已识别
- [ ] 关键事件已标注
- [ ] 趋势预测已完成
- [ ] 趋势报告已生成
