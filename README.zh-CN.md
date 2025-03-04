# Project Mate CLI

[官网](https://fsdtking.github.io/project-mate-cli/) | [English](./README.md) | 简体中文

一个强大的项目管理命令行工具，旨在简化项目开发和管理流程。

## 功能特点

- 🚀 快速项目启动（目前仅支持npm脚本指令）
- 📦 统一的项目管理（可模糊查询全部项目、文本，并通过默认编辑器打开）
- 🚄 友好的git分支管理助手（对分支进行备注管理，并可通过模糊词全局查找相似分支）
- 🔧 便捷的命令行工具
- 🌈 跨平台支持

## 安装

```bash
npm install -g project-mate-cli
```

或者使用 yarn：

```bash
yarn global add project-mate-cli
```

## 使用方法

基本命令格式：

```bash
pm <command> [options]
```

### 常用命令

- `pm search` - 全局多线程模糊查找，避开dist、node_modules等目录，支持远程搜索gitlab、github仓库，详细用法请查看`pm search --help`
- `pm open` - 通过默认编辑器打开项目
- `pm br` - 分支管理，支持对各分支进行备注管理，同时支持全局模糊搜索分支或分支备注，详细用法请查看`pm br --help`
- `pm run` - 通过默认脚本执行器执行项目脚本，详细用法请查看`pm run --help`
- `pm config` - 配置项目，详细用法请查看`pm config --help`

更多命令和选项请运行：

```bash
pm --help
```

## 开发

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/fsdtking/project-mate-cli.git

# 安装依赖
npm install

# 构建项目
npm run build

# 启动开发环境
npm start
```

## 贡献指南

我们欢迎任何形式的贡献，包括但不限于：

- 提交问题和建议
- 改进文档
- 提交代码改进
- 分享使用经验

请确保在提交 Pull Request 之前：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 开源协议

本项目采用 [MIT 许可证](LICENSE)。这意味着您可以自由地使用、修改和分发本项目，但需要保留原始许可证和版权信息。
