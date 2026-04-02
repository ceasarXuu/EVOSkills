# 安全检查清单

## ✅ 已完成的安全措施

### 1. 敏感文件保护
- ✅ `.env.local` 已添加到 `.gitignore`
- ✅ 所有 `.env` 文件都已忽略
- ✅ 敏感配置文件不会被提交

### 2. Git历史检查
- ✅ 没有发现 `.env` 文件被提交到Git历史
- ✅ 没有发现API keys泄露
- ✅ 没有发现npm token泄露

### 3. 文档检查
- ✅ README.md 没有敏感信息
- ✅ CHANGELOG.md 没有敏感信息
- ✅ RELEASE.md 没有敏感信息

---

## 🔒 安全最佳实践

### 环境变量管理

1. **永远不要提交 `.env` 文件**
   ```bash
   # 确保这些文件在 .gitignore 中
   .env
   .env.local
   .env.*.local
   ```

2. **使用 `.env.example` 作为模板**
   - 提供配置示例
   - 不包含真实密钥
   - 用户需要复制并填写自己的值

3. **定期检查Git历史**
   ```bash
   # 检查是否有敏感文件被提交
   git log --all --full-history -- "*.env*"

   # 检查是否有API keys泄露
   git log --all -p | grep -E "sk-[a-zA-Z0-9]{20,}"
   ```

---

## 🚨 如果发生泄露

### 1. 立即撤销泄露的密钥
- **npm token**: 访问 https://www.npmjs.com/settings/username/tokens 撤销
- **API keys**: 访问对应服务商控制台重新生成

### 2. 清理Git历史
```bash
# 使用 BFG Repo-Cleaner 或 git filter-branch
# 警告：这会重写Git历史，需要强制推送

# 示例：删除所有 .env 文件
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' \
  --prune-empty --tag-name-filter cat -- --all
```

### 3. 强制推送（谨慎操作）
```bash
git push origin --force --all
git push origin --force --tags
```

---

## 📋 发布前检查清单

在每次发布前，确保：

- [ ] `.env.local` 不在Git跟踪中
- [ ] `.env.example` 不包含真实密钥
- [ ] 文档中没有硬编码的密钥
- [ ] Git历史中没有敏感信息
- [ ] CI/CD配置中使用环境变量而非硬编码密钥

---

## 🔐 推荐的安全工具

### 1. GitLeaks
自动检测Git仓库中的敏感信息
```bash
# 安装
brew install gitleaks

# 扫描
gitleaks detect --source . --verbose
```

### 2. git-secrets
防止提交敏感信息
```bash
# 安装
brew install git-secrets

# 配置
git secrets --install
git secrets --register-aws
```

### 3. pre-commit
在提交前自动检查
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

---

## 📞 联系方式

如果发现安全漏洞，请通过以下方式报告：
- Email: security@example.com
- GitHub Issues: 使用 "security" 标签

---

## 🔄 定期安全审计

建议每月进行一次安全审计：

1. 检查 `.gitignore` 是否完整
2. 扫描Git历史中的敏感信息
3. 检查依赖包的安全性 (`npm audit`)
4. 更新过期的API keys
5. 检查CI/CD配置中的密钥管理

---

## 📚 参考资源

- [GitHub安全最佳实践](https://docs.github.com/en/code-security)
- [npm安全指南](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
