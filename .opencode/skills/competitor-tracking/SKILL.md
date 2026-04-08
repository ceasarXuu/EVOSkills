---
name: competitor-tracking
description: 竞品监控技能,定期抓取竞品数据,追踪版本更新、评分变化和功能演进
---

# 竞品监控技能

## 概述

持续追踪竞品动态,及时发现市场变化和竞争威胁。

## 核心能力

1. **定期数据抓取**: 自动化收集竞品信息
2. **版本更新追踪**: 监控功能变化
3. **评分趋势分析**: 追踪用户满意度
4. **功能变化检测**: 识别新功能和改进

## 监控指标

### 1. 基础指标
- App 版本号
- 发布日期
- 评分 (总评分和各星级分布)
- 评论数量
- 下载量估算 (如果可获得)

### 2. 内容指标
- 应用描述变化
- 截图更新
- 新功能列表
- 更新日志

### 3. 用户反馈指标
- 最新评论
- 评分趋势
- 常见抱怨
- 功能请求

## 数据库结构

```sql
-- 竞品基础信息表
CREATE TABLE competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT NOT NULL,
  app_id TEXT UNIQUE NOT NULL,
  bundle_id TEXT,
  category TEXT,
  developer TEXT,
  first_tracked_date TEXT,
  is_active INTEGER DEFAULT 1
);

-- 竞品历史快照表
CREATE TABLE competitor_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER,
  snapshot_date TEXT NOT NULL,
  version TEXT,
  release_date TEXT,
  rating REAL,
  rating_count INTEGER,
  review_count INTEGER,
  price TEXT,
  description TEXT,
  whats_new TEXT,
  FOREIGN KEY (competitor_id) REFERENCES competitors(id)
);

-- 评分分布表
CREATE TABLE rating_distribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER,
  star_5 INTEGER,
  star_4 INTEGER,
  star_3 INTEGER,
  star_2 INTEGER,
  star_1 INTEGER,
  FOREIGN KEY (snapshot_id) REFERENCES competitor_snapshots(id)
);

-- 功能追踪表
CREATE TABLE competitor_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER,
  feature_name TEXT,
  first_detected_date TEXT,
  last_verified_date TEXT,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (competitor_id) REFERENCES competitors(id)
);
```

## 监控流程

### 步骤 1: 初始化竞品列表
```sql
-- 添加竞品
INSERT INTO competitors (app_name, app_id, bundle_id, category, developer, first_tracked_date)
VALUES 
  ('Battery Life', '1234567890', 'com.example.battery', 'Utilities', 'Example Dev', '2025-01-15'),
  ('System Status', '0987654321', 'com.example.system', 'Utilities', 'Another Dev', '2025-01-15');
```

### 步骤 2: 定期抓取数据
**频率建议**:
- 每周一次: 常规监控
- 每天一次: 重点竞品或关键时期
- 实时: 重大事件期间

**抓取方法**:
```
使用 Playwright 访问 App Store:
1. 构造 URL: https://apps.apple.com/app/id[app_id]
2. 提取页面数据
3. 存储到 competitor_snapshots
```

### 步骤 3: 变化检测
```sql
-- 检测版本更新
SELECT 
  c.app_name,
  cs1.version as current_version,
  cs2.version as previous_version,
  cs1.snapshot_date as update_date
FROM competitor_snapshots cs1
JOIN competitor_snapshots cs2 ON cs1.competitor_id = cs2.competitor_id
JOIN competitors c ON cs1.competitor_id = c.id
WHERE cs1.version != cs2.version
  AND cs1.snapshot_date > cs2.snapshot_date
ORDER BY cs1.snapshot_date DESC;

-- 检测评分变化
SELECT 
  c.app_name,
  cs1.rating as current_rating,
  cs2.rating as previous_rating,
  cs1.rating - cs2.rating as rating_change
FROM competitor_snapshots cs1
JOIN competitor_snapshots cs2 ON cs1.competitor_id = cs2.competitor_id
JOIN competitors c ON cs1.competitor_id = c.id
WHERE cs1.id = (
    SELECT MAX(id) FROM competitor_snapshots WHERE competitor_id = cs1.competitor_id
  )
  AND cs2.id = (
    SELECT MAX(id) FROM competitor_snapshots 
    WHERE competitor_id = cs2.competitor_id AND id < cs1.id
  )
  AND ABS(cs1.rating - cs2.rating) > 0.1;
```

### 步骤 4: 生成监控报告
```markdown
# 竞品监控周报 - [日期]

## 重大更新

### [竞品名称] - 版本 X.X.X
- 发布日期: YYYY-MM-DD
- 主要变化:
  - 新增功能: [列表]
  - 改进: [列表]
  - 修复: [列表]
- 用户反应: [评分变化, 评论摘要]

## 评分趋势

| 竞品 | 当前评分 | 上周评分 | 变化 | 趋势 |
|------|---------|---------|------|------|
| A    | 4.2     | 4.1     | +0.1 | ↑    |
| B    | 3.8     | 3.9     | -0.1 | ↓    |

## 新功能发现

- [竞品名]: 新增 [功能名]
  - 描述: ...
  - 影响: ...
  - 我们的应对: ...

## 用户反馈洞察

### 正面反馈
- [竞品]: 用户喜欢 [功能/改进]

### 负面反馈
- [竞品]: 用户抱怨 [问题]
  - 机会: 我们可以 [如何做得更好]

## 建议行动

1. [基于监控发现的具体建议]
2. [建议 2]
```

## 自动化监控

### 监控脚本伪代码
```python
def monitor_competitors():
    # 获取竞品列表
    competitors = db.query("SELECT * FROM competitors WHERE is_active = 1")
    
    for competitor in competitors:
        # 抓取最新数据
        data = scrape_app_store(competitor['app_id'])
        
        # 存储快照
        snapshot_id = db.insert("""
            INSERT INTO competitor_snapshots 
            (competitor_id, snapshot_date, version, rating, ...)
            VALUES (?, ?, ?, ?, ...)
        """, competitor['id'], today, data['version'], data['rating'], ...)
        
        # 检测变化
        changes = detect_changes(competitor['id'], snapshot_id)
        
        # 如果有重大变化,发送通知
        if changes['is_significant']:
            send_notification(changes)
    
    # 生成周报
    if is_monday():
        generate_weekly_report()
```

### 通知触发条件
```
重大变化定义:
- 版本号更新
- 评分变化 > 0.2
- 评论数增加 > 20%
- 新功能发布 (从更新日志检测)
```

## 趋势分析

### 评分趋势
```sql
-- 最近 3 个月的评分趋势
SELECT 
  c.app_name,
  cs.snapshot_date,
  cs.rating
FROM competitor_snapshots cs
JOIN competitors c ON cs.competitor_id = c.id
WHERE cs.snapshot_date >= DATE('now', '-3 months')
ORDER BY c.app_name, cs.snapshot_date;
```

### 更新频率分析
```sql
-- 计算平均更新间隔
SELECT 
  c.app_name,
  COUNT(*) as version_count,
  JULIANDAY(MAX(cs.release_date)) - JULIANDAY(MIN(cs.release_date)) as days_tracked,
  (JULIANDAY(MAX(cs.release_date)) - JULIANDAY(MIN(cs.release_date))) / COUNT(*) as avg_days_between_updates
FROM competitor_snapshots cs
JOIN competitors c ON cs.competitor_id = c.id
WHERE cs.version IS NOT NULL
GROUP BY c.app_name;
```

### 用户增长分析
```sql
-- 评论数增长
SELECT 
  c.app_name,
  cs1.review_count as current_reviews,
  cs2.review_count as month_ago_reviews,
  cs1.review_count - cs2.review_count as review_growth,
  (cs1.review_count - cs2.review_count) * 100.0 / cs2.review_count as growth_rate
FROM competitor_snapshots cs1
JOIN competitor_snapshots cs2 ON cs1.competitor_id = cs2.competitor_id
JOIN competitors c ON cs1.competitor_id = c.id
WHERE cs1.snapshot_date = DATE('now')
  AND cs2.snapshot_date = DATE('now', '-1 month');
```

## 功能对比矩阵维护

### 初始化功能列表
```sql
-- 添加功能
INSERT INTO competitor_features (competitor_id, feature_name, first_detected_date, is_active)
VALUES 
  (1, 'Battery Health Monitoring', '2025-01-15', 1),
  (1, 'Charging Optimization', '2025-01-15', 1);
```

### 更新功能状态
```
定期检查:
1. 下载竞品 App
2. 手动测试功能
3. 更新 is_active 状态
4. 记录 last_verified_date
```

### 生成功能对比表
```sql
SELECT 
  f.feature_name,
  GROUP_CONCAT(
    CASE WHEN cf.is_active = 1 THEN c.app_name ELSE NULL END
  ) as apps_with_feature
FROM (SELECT DISTINCT feature_name FROM competitor_features) f
LEFT JOIN competitor_features cf ON f.feature_name = cf.feature_name
LEFT JOIN competitors c ON cf.competitor_id = c.id
GROUP BY f.feature_name;
```

## 预警机制

### 设置预警规则
```
规则 1: 评分下降预警
- 条件: 竞品评分下降 > 0.3
- 行动: 分析原因,评估是否影响我们

规则 2: 新功能预警
- 条件: 竞品发布新功能
- 行动: 评估功能价值,决定是否跟进

规则 3: 定价变化预警
- 条件: 竞品价格变化
- 行动: 评估对市场的影响

规则 4: 增长异常预警
- 条件: 竞品评论数增长 > 50%/月
- 行动: 分析增长原因,学习策略
```

## 最佳实践

1. **保持数据新鲜**: 至少每周更新一次
2. **关注关键竞品**: 不要追踪太多,聚焦 Top 5-7
3. **手动验证**: 自动化数据需要定期人工验证
4. **记录上下文**: 重大变化要记录背景和原因
5. **行动导向**: 监控的目的是指导决策,不是收集数据

## 输出清单

- [ ] 竞品数据库已建立
- [ ] 定期抓取脚本已设置
- [ ] 周报模板已准备
- [ ] 预警规则已配置
- [ ] 功能对比矩阵已维护
