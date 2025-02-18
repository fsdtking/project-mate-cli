#!/bin/bash

# 设置变量
VERSION="1.0.0"
IDENTIFIER="com.project-mate-cli"
INSTALL_LOCATION="/usr/local/lib/project-mate-cli"

# 创建临时目录
rm -rf build
mkdir -p build/root"$INSTALL_LOCATION"

# 复制二进制文件
cp dist/pm-mac build/root"$INSTALL_LOCATION"/pm

# 设置脚本权限
chmod +x scripts/preinstall scripts/postinstall

# 创建组件包
pkgbuild \
  --root build/root \
  --identifier "$IDENTIFIER" \
  --version "$VERSION" \
  --scripts scripts \
  --install-location "/" \
  build/component.pkg

# 创建发布包
productbuild \
  --distribution scripts/distribution.xml \
  --package-path build \
  --resources resources \
  "dist/Project Mate CLI.pkg"

# 清理
rm -rf build
