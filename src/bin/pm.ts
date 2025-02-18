#!/usr/bin/env node

import { program } from 'commander';
import { searchProjects } from '../lib/search';
import { setConfig, getConfig, getConfigValue, getConfigKeys, ensureConfig } from '../lib/config';
import { Config } from '../types';
import chalk from 'chalk';
import { 
  setBranchDescription, 
  listBranchesWithDescription, 
  searchBranches,
  getCurrentBranch
} from '../lib/branch';
import { listAndRunScript } from '../lib/script';
import { searchProjects as searchLocalProjects } from '../lib/open';
import { installCLI } from '../install';

// 确保配置文件存在
async function init() {
  try {
    await ensureConfig();
  } catch (error) {
    console.error(chalk.red('初始化配置文件失败：'), error);
    process.exit(1);
  }
}

// 主函数
async function main() {
  // 检查是否是双击运行
  const isDoubleClick = process.argv.length === 2;

  if (isDoubleClick) {
    console.log(chalk.blue('正在安装 project-mate-cli...'));
    try {
      await installCLI();
      console.log(chalk.green('\n安装完成！'));
      console.log(chalk.yellow('\n按任意键退出...'));
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', () => process.exit(0));
      return;
    } catch (error) {
      console.error(chalk.red('\n安装过程出错:'), error);
      console.log(chalk.yellow('\n按任意键退出...'));
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', () => process.exit(1));
      return;
    }
  }

  // 正常命令行模式
  await init();
}

// 启动程序
main().catch(error => {
  console.error(chalk.red('程序执行出错:'), error);
  process.exit(1);
});

// 搜索命令
program
  .command('search [keyword]')
  .description('搜索项目')
  .option('-g, --git', '在 GitLab 中搜索项目')
  .action(async (keyword?: string, options?: { git?: boolean }) => {
    if (!keyword) {
      console.error(chalk.red('错误：必须提供搜索关键词'));
      return;
    }
    try {
      await searchProjects(keyword, options?.git);
    } catch (error) {
      console.error(chalk.red('搜索失败：'), error);
    }
  });

// 打开项目命令
program
  .command('open [keyword]')
  .description('搜索并打开本地项目')
  .action(async (keyword?: string) => {
    try {
      await searchLocalProjects(keyword || '');
    } catch (error) {
      console.error(chalk.red('打开项目失败：'), error);
    }
  });

// 配置管理命令
program
  .command('config')
  .description('配置管理')
  .addCommand(
    program
      .command('set <key> [value]')
      .description('设置配置项')
      .action(async (key: string, value?: string) => {
        try {
          const validKeys = await getConfigKeys();
          if (!validKeys.includes(key as keyof Config)) {
            console.error(chalk.red('错误：无效的配置项'));
            console.log(chalk.yellow('可用的配置项：'));
            validKeys.forEach(k => console.log(chalk.blue(`  - ${k}`)));
            return;
          }
          await setConfig(key as keyof Config, value || '');
          console.log(chalk.green(`配置项 ${key} 已更新`));
        } catch (error) {
          console.error(chalk.red('设置配置失败：'), error);
        }
      })
  )
  .addCommand(
    program
      .command('get [key]')
      .description('获取配置项，不指定 key 时获取所有配置')
      .action(async (key?: string) => {
        try {
          if (key) {
            const validKeys = await getConfigKeys();
            if (!validKeys.includes(key as keyof Config)) {
              console.error(chalk.red('错误：无效的配置项'));
              console.log(chalk.yellow('可用的配置项：'));
              validKeys.forEach(k => console.log(chalk.blue(`  - ${k}`)));
              return;
            }
            const value = await getConfigValue(key as keyof Config);
            if (value) {
              console.log(chalk.green(`${key}: ${value}`));
            } else {
              console.log(chalk.yellow(`未找到配置项：${key}`));
              const keys = await getConfigKeys();
              console.log(chalk.gray('可用的配置项：', keys.join(', ')));
            }
          } else {
            const config = await getConfig();
            console.log(chalk.green('当前配置：'));
            Object.entries(config).forEach(([key, value]) => {
              console.log(chalk.blue(`${key}: ${value}`));
            });
          }
        } catch (error) {
          console.error(chalk.red('获取配置失败：'), error);
        }
      })
  );

// 分支管理命令
program
  .command('br')
  .description('分支管理')
  .addCommand(
    program
      .command('set [branch] [description]')
      .description('设置分支备注，不指定分支名时使用当前分支')
      .action(async (branch?: string, description?: string) => {
        try {
          // 如果只提供了一个参数，那么它是 description，branch 使用当前分支
          if (branch && !description) {
            description = branch;
            branch = undefined;
          }

          // 确保有 description
          if (!description) {
            console.error(chalk.red('错误：必须提供备注内容'));
            return;
          }

          await setBranchDescription(description, branch);
        } catch (error) {
          console.error(chalk.red('设置分支备注失败：'), error);
        }
      })
  )
  .addCommand(
    program
      .command('list')
      .description('列出所有带备注的分支')
      .action(async () => {
        try {
          const currentBranch = await getCurrentBranch();
          const branches = await listBranchesWithDescription();
          
          if (branches.length === 0) {
            console.log(chalk.yellow('当前项目没有带备注的分支'));
            return;
          }

          console.log(chalk.yellow('\n当前项目的分支备注：'));
          branches.forEach(({ branch, description }) => {
            const isCurrent = branch === currentBranch;
            console.log(chalk.blue(`  ${isCurrent ? '* ' : '  '}${branch}`));
            console.log(chalk.gray(`    备注: ${description}`));
          });
        } catch (error) {
          console.error(chalk.red('获取分支备注失败：'), error);
        }
      })
  )
  .addCommand(
    program
      .command('search <keyword>')
      .description('搜索所有本地仓库的分支')
      .action(async (keyword: string) => {
        try {
          await searchBranches(keyword);
        } catch (error) {
          console.error(chalk.red('搜索分支失败：'), error);
        }
      })
  );

// 脚本运行命令
program
  .command('run')
  .description('运行 package.json 中的脚本命令')
  .action(async () => {
    try {
      await listAndRunScript();
    } catch (error) {
      console.error(chalk.red('运行脚本失败：'), error);
    }
  });

program.parse(process.argv);
