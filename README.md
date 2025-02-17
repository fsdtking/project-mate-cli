# Project Mate CLI

一个强大的项目管理命令行工具，帮助你快速搜索、打开和管理本地和远程项目。

## 特性

- 🔍 搜索项目：支持本地和 GitLab 项目搜索
- 📂 打开项目：快速搜索并打开本地项目
- 🔄 运行脚本：交互式运行项目中的 npm 脚本
- 🌿 分支管理：为分支添加备注，方便记录和查找
- ⚙️ 配置管理：灵活的配置项管理

## 安装

```bash
npm install -g project-mate-cli
```

## 配置

首次使用时，需要设置必要的配置项：

```bash
# 设置本地项目根目录
pm config set local-project-root-directory "/path/to/your/projects"

# 设置 GitLab 相关配置（如果需要使用 GitLab 功能）
pm config set gitlab-token "your-gitlab-token"
pm config set gitlab-api-url "your-gitlab-api-url"
```

## 使用方法

### 打开项目

```bash
# 列出并打开本地项目
pm open

# 搜索并打开特定项目
pm open project-name
```

### 搜索项目

```bash
# 搜索本地项目
pm search keyword

# 搜索 GitLab 项目
pm search keyword -g
```

### 运行脚本

```bash
# 列出并运行项目中的 npm 脚本
pm run
```

脚本运行功能会自动检测项目类型（客户端/服务端），并为不同类型的命令添加特殊标记：

- 客户端项目：
  - 🚀 开发服务器 (dev, serve)
  - 📦 构建命令 (build)
  - 🧪 测试命令 (test)

- 服务端项目：
  - 🚀 启动服务器 (start)
  - 🔄 数据库迁移 (migrate)
  - 🌱 数据库填充 (seed)

### 分支管理

```bash
# 为当前分支添加备注
pm br set "这是一个新功能分支"

# 为指定分支添加备注
pm br set feature/new-feature "这是一个新功能分支"

# 列出所有带备注的分支
pm br list

# 搜索分支
pm br search keyword
```

### 配置管理

```bash
# 查看所有配置
pm config get

# 查看特定配置项
pm config get gitlab-token

# 设置配置项
pm config set local-project-root-directory "/path/to/projects"
```

## 提示

1. 使用 `pm open` 命令时，只会搜索配置的本地项目根目录下的一级目录。
2. 项目类型（客户端/服务端）是根据项目依赖自动检测的。
3. 分支备注功能需要在 Git 仓库目录下使用。
4. 运行脚本功能需要项目中包含 package.json 文件。

## 常见问题

1. 如果无法打开项目，请确保已正确安装并配置了 Windsurf。
2. 如果无法搜索 GitLab 项目，请检查 GitLab Token 和 API URL 配置是否正确。
3. 如果项目类型检测不准确，可以在项目的 package.json 中添加 "projectType" 字段手动指定。
