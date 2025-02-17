# Project Mate CLI

一个强大的项目管理命令行工具，用于快速搜索、克隆和管理本地及远程 Git 项目。

## 特点

- 🔍 本地项目搜索
- 🌐 GitLab 项目搜索与克隆
- 📝 Git 分支备注管理
- ⚙️ 灵活的配置管理

## 安装

```bash
npm install -g project-mate-cli
```

## 配置

首次运行时会自动创建配置文件。您也可以手动配置：

```bash
# 设置 GitLab API 地址
pm config set gitlab-api-url "https://gitlab.example.com/api/v4"

# 设置 GitLab 访问令牌
pm config set gitlab-token "your-token-here"

# 设置本地项目根目录
pm config set local-project-root-directory "/path/to/your/projects"
```

查看当前配置：
```bash
pm config list
```

## 功能说明

### 1. 项目搜索

#### 本地项目搜索
```bash
# 在本地项目目录中搜索
pm search "关键词"
```

#### GitLab 项目搜索
```bash
# 在 GitLab 中搜索项目并可选择克隆
pm search -g "关键词"
```

### 2. 分支管理

#### 设置分支备注
```bash
# 为当前分支添加备注
pm br set "这是一个新功能分支"

# 为指定分支添加备注
pm br set feature/new-ui "新的用户界面开发"
```

#### 查看分支备注
```bash
# 列出当前仓库所有带备注的分支
pm br list
```

#### 搜索分支
```bash
# 在所有本地仓库中搜索分支（支持分支名和备注内容）
pm br search "feature"
```

## 配置文件说明

配置文件 `pm_config.json` 包含以下配置项：

```json
{
  "git-remote-address": "https://github.com/",
  "local-project-root-directory": "/path/to/your/projects",
  "gitlab-token": "your-gitlab-token",
  "gitlab-api-url": "https://gitlab.example.com/api/v4"
}
```

- `git-remote-address`: 默认的 Git 远程仓库地址
- `local-project-root-directory`: 本地项目根目录，用于项目搜索
- `gitlab-token`: GitLab 个人访问令牌，用于访问 GitLab API
- `gitlab-api-url`: GitLab API 地址

## 使用提示

1. 分支备注功能
   - 可以为任何分支添加描述性的备注
   - 备注内容会保存在 Git 配置中
   - 可以通过搜索功能查找特定备注

2. GitLab 集成
   - 确保已正确设置 GitLab token 和 API URL
   - 搜索结果会显示项目描述和 URL
   - 可以直接选择并克隆找到的项目

3. 本地搜索
   - 会递归搜索配置的项目根目录
   - 自动排除 node_modules 等目录
   - 支持模糊匹配

## 常见问题

1. GitLab 搜索失败
   - 检查 GitLab token 是否正确设置
   - 确认 API URL 是否可访问
   - 验证 token 是否有足够的权限

2. 分支备注不显示
   - 确认当前目录是 Git 仓库
   - 检查是否有写入权限
   - 确认 Git 配置是否正确

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

MIT
