# Project Mate CLI 开发文档

## 项目结构

```
project-mate-cli/
├── src/                    # 源代码目录
│   ├── bin/               # CLI 入口
│   │   └── pm.ts         # 主程序入口
│   ├── lib/              # 核心库
│   │   ├── search.ts     # 搜索功能
│   │   ├── config.ts     # 配置管理
│   │   └── ...
│   └── types.ts          # 类型定义
├── scripts/               # 构建脚本
│   ├── build-pkg.sh      # macOS 安装包构建脚本
│   ├── preinstall        # 安装前脚本
│   ├── postinstall       # 安装后脚本
│   └── distribution.xml  # 安装包配置
├── resources/            # 安装包资源
│   ├── welcome.html     # 欢迎页面
│   ├── license.html     # 许可协议
│   └── conclusion.html  # 完成页面
├── dist/                # 构建输出目录
└── package.json        # 项目配置
```

## 开发环境设置

1. 安装依赖
```bash
npm install
```

2. 开发时实时构建
```bash
npm run watch
```

## 构建流程

### 1. 构建 TypeScript 代码
```bash
npm run build
```
这个命令会：
- 编译 TypeScript 代码到 `dist` 目录
- 使用 `@vercel/ncc` 打包所有依赖

### 2. 打包可执行文件
```bash
npm run pack:mac
```
这个命令会：
- 使用 `pkg` 将 Node.js 应用打包成独立可执行文件
- 输出文件：`dist/pm-mac`

### 3. 构建 macOS 安装包
```bash
./scripts/build-pkg.sh
```
这个命令会：
1. 创建临时构建目录
2. 复制可执行文件到正确的位置
3. 使用 `pkgbuild` 创建组件包
4. 使用 `productbuild` 创建最终的安装包
5. 输出文件：`dist/Project Mate CLI.pkg`

## 发布流程

1. 更新版本号
```bash
npm version [major|minor|patch]
```

2. 构建发布包
```bash
# 构建所有内容
npm run build && npm run pack:mac && ./scripts/build-pkg.sh
```

3. 测试安装包
```bash
# 安装
sudo installer -pkg "dist/Project Mate CLI.pkg" -target /

# 验证安装
pm --version
```

4. 发布
- 将 `dist/Project Mate CLI.pkg` 上传到发布平台

## 安装包结构

### 安装位置
- 可执行文件：`/usr/local/lib/project-mate-cli/pm`
- 软链接：`/usr/local/bin/pm`
- PATH 配置：`/etc/paths.d/project-mate-cli`

### 安装流程
1. 预安装脚本 (`preinstall`)
   - 创建必要的目录结构

2. 文件复制
   - 复制主程序到 `/usr/local/lib/project-mate-cli`

3. 后安装脚本 (`postinstall`)
   - 设置文件权限
   - 创建软链接
   - 配置 PATH

### 自定义安装界面
- `resources/welcome.html`: 欢迎页面
- `resources/license.html`: 许可协议
- `resources/conclusion.html`: 安装完成页面

## 调试

### 本地调试
```bash
# 直接运行 TypeScript 代码
npm run dev

# 调试特定命令
npm run dev -- search test
```

### 打包后调试
```bash
# 构建并运行
npm run build && npm run pack:mac && ./dist/pm-mac
```

### 安装包调试
```bash
# 构建安装包
./scripts/build-pkg.sh

# 查看安装包内容
pkgutil --expand "dist/Project Mate CLI.pkg" expanded

# 验证安装包
pkgutil --check-signature "dist/Project Mate CLI.pkg"
```

## 常见问题

### 1. 权限问题
如果遇到权限错误，确保：
- 构建脚本有执行权限：`chmod +x scripts/*`
- 使用 `sudo` 安装包

### 2. PATH 问题
如果 `pm` 命令无法找到：
- 检查 `/etc/paths.d/project-mate-cli` 是否存在
- 重新加载 shell：`source ~/.zshrc` 或 重启终端

### 3. 卸载
```bash
# 删除程序文件
sudo rm -rf /usr/local/lib/project-mate-cli

# 删除软链接
sudo rm /usr/local/bin/pm

# 删除 PATH 配置
sudo rm /etc/paths.d/project-mate-cli
```
