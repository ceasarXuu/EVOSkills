---
name: web-scraping
description: 网页数据提取技能,使用 Playwright 进行动态内容抓取,处理反爬虫机制,数据清洗和结构化
---

# 网页数据提取技能

## 概述

本技能提供系统化的网页数据抓取方法,特别针对商业研究场景中的社交媒体、应用商店和论坛数据提取。

## 核心能力

1. **动态内容抓取**: 使用 Playwright 处理 JavaScript 渲染的页面
2. **反爬虫应对**: 模拟真实用户行为,避免被封禁
3. **数据清洗**: 提取结构化数据并去除噪声
4. **批量处理**: 高效处理大量页面

## 工具要求

- **Playwright MCP**: 浏览器自动化
- **Fetch MCP**: 静态页面获取
- **SQLite MCP**: 数据存储

## 使用场景

### 场景 1: 抓取 Reddit 讨论
```
目标: 收集特定主题的用户讨论
步骤:
1. 使用 Playwright 访问 Reddit 子版块
2. 搜索关键词
3. 抓取热门帖子 (按 upvotes 排序)
4. 提取: 标题、内容、评论数、upvotes、发布时间
5. 存储到 SQLite
```

**示例代码逻辑**:
```javascript
// 访问 Reddit
await page.goto('https://reddit.com/r/iPhone');

// 搜索关键词
await page.fill('input[name="q"]', 'battery anxiety');
await page.click('button[type="submit"]');

// 等待结果加载
await page.waitForSelector('.Post');

// 提取数据
const posts = await page.$$eval('.Post', posts => {
  return posts.map(post => ({
    title: post.querySelector('h3').textContent,
    upvotes: post.querySelector('[data-test-id="post-upvote-count"]').textContent,
    url: post.querySelector('a').href,
    timestamp: post.querySelector('time').getAttribute('datetime')
  }));
});
```

### 场景 2: 抓取 App Store 评论
```
目标: 收集竞品的用户评论
步骤:
1. 访问 App Store 网页版
2. 滚动加载更多评论
3. 提取: 评分、评论内容、用户名、日期
4. 按评分分类存储
```

**注意事项**:
- App Store 有动态加载,需要模拟滚动
- 评论可能需要点击"查看更多"
- 注意语言和地区设置

### 场景 3: 抓取 X.com (Twitter) 讨论
```
目标: 收集实时用户抱怨
步骤:
1. 搜索关键词
2. 按"最新"排序
3. 提取推文和互动数据
4. 过滤垃圾信息
```

**反爬虫策略**:
- 随机延迟 (1-3 秒)
- 模拟鼠标移动
- 使用真实的 User-Agent
- 避免过于频繁的请求

### 场景 4: 抓取 Product Hunt
```
目标: 发现新兴竞品
步骤:
1. 访问特定类别页面
2. 提取产品列表
3. 收集: 产品名、描述、upvotes、评论数、链接
4. 分析趋势
```

## 数据清洗最佳实践

### 1. 文本清洗
```
原始数据: "  Battery health dropped to 96%!!! 😱😱  "
清洗后: "Battery health dropped to 96%"

步骤:
- 去除前后空格
- 移除多余的标点符号
- 移除 emoji (可选)
- 统一大小写 (可选)
```

### 2. 时间标准化
```
原始: "2 hours ago", "Jan 15, 2025", "2025-01-15T10:30:00Z"
标准化: "2025-01-15 10:30:00"

使用 ISO 8601 格式存储
```

### 3. 数值提取
```
原始: "1.2K upvotes", "5M downloads"
提取: 1200, 5000000

处理 K (千), M (百万), B (十亿)
```

### 4. 去重
```
基于内容相似度去重:
- 完全相同: 直接删除
- 高度相似 (>90%): 保留 upvotes 最高的
- 中度相似 (70-90%): 标记为相关
```

## 数据存储结构

### Reddit 数据表
```sql
CREATE TABLE reddit_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subreddit TEXT,
  title TEXT,
  content TEXT,
  author TEXT,
  upvotes INTEGER,
  comment_count INTEGER,
  url TEXT UNIQUE,
  created_at TEXT,
  scraped_at TEXT,
  category TEXT
);

CREATE TABLE reddit_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  content TEXT,
  author TEXT,
  upvotes INTEGER,
  created_at TEXT,
  FOREIGN KEY (post_id) REFERENCES reddit_posts(id)
);
```

### App Store 评论表
```sql
CREATE TABLE app_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT,
  app_id TEXT,
  rating INTEGER,
  review_title TEXT,
  review_content TEXT,
  reviewer_name TEXT,
  review_date TEXT,
  helpful_count INTEGER,
  scraped_at TEXT
);
```

### X.com 推文表
```sql
CREATE TABLE tweets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_id TEXT UNIQUE,
  content TEXT,
  author TEXT,
  likes INTEGER,
  retweets INTEGER,
  replies INTEGER,
  created_at TEXT,
  url TEXT,
  scraped_at TEXT
);
```

## 反爬虫策略

### 1. 请求频率控制
```
规则:
- 每个请求间隔 1-3 秒 (随机)
- 每 10 个请求后暂停 5-10 秒
- 每小时不超过 100 个请求
```

### 2. User-Agent 轮换
```
使用真实的浏览器 User-Agent:
- Chrome on macOS
- Safari on iOS
- Firefox on Windows

避免使用明显的爬虫标识
```

### 3. 代理使用 (可选)
```
如果需要大量抓取:
- 使用住宅代理
- 轮换 IP 地址
- 注意成本
```

### 4. 会话管理
```
保持会话状态:
- 保存 cookies
- 模拟登录 (如果需要)
- 处理验证码 (手动或服务)
```

## 错误处理

### 常见错误及应对

1. **页面加载超时**
   - 增加超时时间
   - 重试 2-3 次
   - 记录失败的 URL

2. **元素未找到**
   - 检查选择器是否正确
   - 等待元素出现
   - 页面结构可能已变化

3. **被封禁**
   - 降低请求频率
   - 更换 IP
   - 暂停 24 小时

4. **数据格式变化**
   - 实现灵活的解析逻辑
   - 添加数据验证
   - 及时更新选择器

## 性能优化

### 1. 并发控制
```
不要同时打开太多浏览器实例:
- 最多 3-5 个并发
- 使用队列管理任务
- 监控内存使用
```

### 2. 缓存策略
```
避免重复抓取:
- 检查 URL 是否已存在
- 设置数据有效期
- 定期清理过期数据
```

### 3. 增量抓取
```
只抓取新内容:
- 记录最后抓取时间
- 按时间过滤
- 减少不必要的请求
```

## 合规性注意事项

1. **遵守 robots.txt**: 检查网站的爬虫政策
2. **服务条款**: 确保不违反网站的使用条款
3. **数据隐私**: 不收集个人隐私信息
4. **合理使用**: 不对网站造成过大负担
5. **数据使用**: 仅用于研究目的,不公开传播

## 输出格式

### 抓取报告模板
```markdown
# [网站名称] 数据抓取报告

## 抓取概况
- 抓取时间: YYYY-MM-DD HH:MM:SS
- 目标网站: [URL]
- 抓取页面数: X
- 成功率: XX%

## 数据统计
- 总记录数: X
- 有效记录数: X
- 去重后: X

## 数据质量
- 完整性: XX%
- 准确性: 人工抽查 XX 条,准确率 XX%

## 遇到的问题
- [问题描述]
- [解决方案]

## 数据存储
- 数据库: research_data.db
- 表名: [table_name]
```

## 示例工作流

### 完整的 Reddit 抓取流程
```
1. 定义目标
   - 主题: iOS battery anxiety
   - 子版块: r/iPhone, r/iOS
   - 时间范围: 最近 6 个月

2. 执行抓取
   - 使用 Playwright 访问 Reddit
   - 搜索关键词
   - 抓取 Top 50 帖子
   - 抓取每个帖子的 Top 10 评论

3. 数据清洗
   - 去除重复
   - 标准化时间
   - 提取关键信息

4. 数据存储
   - 存入 SQLite
   - 创建索引

5. 数据分析
   - 痛点聚类
   - 情感分析
   - 趋势识别

6. 生成报告
   - 抓取统计
   - 关键发现
   - 数据样本
```

## 故障排除

### Playwright 无法启动
```bash
# 重新安装浏览器
npx playwright install chromium

# 检查依赖
npx playwright install-deps
```

### 数据库锁定
```bash
# 关闭所有连接
# 检查是否有其他进程在使用数据库
lsof research_data.db
```

### 内存不足
```
- 减少并发数
- 及时关闭浏览器实例
- 清理临时数据
```
