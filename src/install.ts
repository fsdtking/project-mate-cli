import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { execSync } from 'child_process';

const INSTALL_DIR = '/usr/local/bin';
const BINARY_NAME = 'pm';

export async function installCLI(): Promise<void> {
  try {
    // 获取当前执行文件的路径
    const currentExePath = process.argv[0];
    
    // 目标路径
    const targetPath = path.join(INSTALL_DIR, BINARY_NAME);

    console.log(chalk.blue(`正在安装到 ${targetPath}...`));

    // 复制可执行文件到目标目录
    await fs.copyFile(currentExePath, targetPath);
    
    // 设置执行权限
    await fs.chmod(targetPath, 0o755);

    // 检查是否需要添加到 PATH
    const shell = process.env.SHELL || '';
    const rcFile = shell.includes('zsh') ? '.zshrc' : '.bashrc';
    const rcPath = path.join(os.homedir(), rcFile);

    // 检查 PATH 中是否已包含安装目录
    try {
      const rcContent = await fs.readFile(rcPath, 'utf8');
      if (!rcContent.includes(INSTALL_DIR)) {
        // 添加到 PATH
        await fs.appendFile(rcPath, `\nexport PATH="$PATH:${INSTALL_DIR}"\n`);
        console.log(chalk.blue(`已添加 ${INSTALL_DIR} 到 PATH`));
      }
    } catch (error) {
      // 如果 rc 文件不存在，创建它
      await fs.writeFile(rcPath, `\nexport PATH="$PATH:${INSTALL_DIR}"\n`);
      console.log(chalk.blue(`已创建 ${rcFile} 并添加 PATH 配置`));
    }

    console.log(chalk.green('安装完成！'));
    console.log(chalk.blue('请运行以下命令使配置生效：'));
    console.log(chalk.yellow(`source ~/${rcFile}`));

  } catch (error: any) {
    if (error?.code === 'EACCES') {
      console.error(chalk.red('错误：需要管理员权限'));
      console.log(chalk.yellow('请使用 sudo 重试安装'));
      process.exit(1);
    }
    throw error;
  }
}

// 如果是直接运行此文件
if (require.main === module) {
  installCLI().catch(error => {
    console.error(chalk.red('安装失败：'), error);
    process.exit(1);
  });
}
