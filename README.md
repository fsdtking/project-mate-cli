# project-mate-cli

一个用于快速查找和管理项目的命令行工具。

## 安装

```bash
npm install -g project-mate-cli
```

## 配置

在项目根目录下创建 `pm_config.json` 文件：

```json
{
  "git-remote-address": "https://github.com/",
  "local-project-root-directory": "/home/"
}
```

## 使用方法

### 本地项目搜索

```bash
pm search <关键词>
```

### Git 仓库搜索

```bash
pm search -g <关键词>
```

## 功能特点

- 支持本地项目文件搜索
- 支持远程 Git 仓库搜索和克隆
- 交互式项目选择
- 彩色命令行输出
