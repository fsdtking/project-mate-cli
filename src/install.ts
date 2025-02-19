import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// 默认安装目录
const DEFAULT_INSTALL_DIR = '/usr/local/bin';
const USER_INSTALL_DIR = path.join(os.homedir(), '.local/bin');
const BINARY_NAME = 'pm';

// 获取实际安装目录
function getInstallDir(): string {
  // 检查环境变量是否指定了安装目录
  const envInstallDir = process.env.PM_INSTALL_DIR;
  if (envInstallDir && existsSync(envInstallDir)) {
    return envInstallDir;
  }

  // 如果用户没有 /usr/local/bin 的写入权限，使用用户目录
  try {
    fs.access(DEFAULT_INSTALL_DIR, fs.constants.W_OK);
    return DEFAULT_INSTALL_DIR;
  } catch {
    return USER_INSTALL_DIR;
  }
}

async function validateInstallPath(installPath: string): Promise<void> {
  // 确保安装目录存在
  if (!existsSync(path.dirname(installPath))) {
    await fs.mkdir(path.dirname(installPath), { recursive: true });
  }

  // 验证目录权限
  try {
    await fs.access(path.dirname(installPath), fs.constants.W_OK);
  } catch {
    throw new Error(`没有写入权限：${path.dirname(installPath)}`);
  }
}

async function backupFile(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    console.log(chalk.blue(`已创建备份：${backupPath}`));
  }
}

export async function installCLI(): Promise<void> {
  try {
    // 获取当前执行文件的路径
    const currentExePath = process.argv[0];
    
    // 获取安装目录并验证
    const installDir = getInstallDir();
    const targetPath = path.join(installDir, BINARY_NAME);
    await validateInstallPath(targetPath);

    console.log(chalk.blue(`正在安装到 ${targetPath}...`));

    // 如果目标文件已存在，先创建备份
    await backupFile(targetPath);

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
      // 备份配置文件
      await backupFile(rcPath);

      let rcContent = '';
      try {
        rcContent = await fs.readFile(rcPath, 'utf8');
      } catch {
        // 文件不存在时创建
        await fs.writeFile(rcPath, '', 'utf8');
      }

      if (!rcContent.includes(installDir)) {
        // 添加到 PATH
        const exportLine = `\nexport PATH="${installDir}:$PATH"\n`;
        await fs.appendFile(rcPath, exportLine);
        console.log(chalk.blue(`已添加 ${installDir} 到 PATH`));
      }
    } catch (error) {
      console.error(chalk.red('配置 PATH 失败：'), error);
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
