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
import { version } from '../../package.json';

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

// 设置程序描述和版本
program
  .name('pm')
  .description('Project Mate CLI - 项目管理工具\n\n更多详细帮助信息:\n  pm search --help    查看搜索命令详细用法\n  pm open --help      查看打开项目命令详细用法\n  pm config --help    查看配置管理命令详细用法\n  pm br --help       查看分支管理命令详细用法\n  pm run --help      查看运行脚本命令详细用法')
  .version(version);

// 搜索命令
program
  .command('search [keyword]')
  .description('搜索项目 - 在本地或 GitLab 中搜索项目\n提示：使用 pm search --help 查看详细用法')
  .option('-g, --git', '在 GitLab 中搜索项目，而不是本地搜索')
  .addHelpText('after', `
  命令用法:
    pm search [keyword]            # 在本地搜索项目
    pm search -g [keyword]         # 在 GitLab 中搜索项目

  参数说明:
    keyword   搜索关键词，支持项目名、描述等
    -g,--git  使用此选项在 GitLab 中搜索

  使用示例:
    pm search react               # 搜索本地的 React 相关项目
    pm search api --git          # 在 GitLab 中搜索 API 相关项目
    pm search "后台管理"          # 搜索本地的后台管理项目
    pm search mobile -g          # 在 GitLab 中搜索移动端项目

  提示:
    - 搜索支持中文和英文
    - 默认在本地搜索，添加 --git 参数搜索 GitLab
    - 关键词中包含空格时需要使用引号`)
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
  .description('搜索并打开本地项目 - 交互式搜索并用编辑器打开项目\n提示：使用 pm open --help 查看详细用法')
  .addHelpText('after', `
  命令用法:
    pm open                      # 列出所有本地项目
    pm open [keyword]            # 搜索并打开匹配的项目

  参数说明:
    keyword   可选的搜索关键词

  使用示例:
    pm open                     # 显示所有项目列表
    pm open react              # 搜索并打开 React 相关项目
    pm open "后台管理"          # 搜索并打开后台管理项目
    pm open api                # 搜索并打开 API 相关项目

  提示:
    - 不输入关键词时显示所有项目
    - 支持模糊搜索和中文
    - 使用配置的默认编辑器打开项目
    - 可通过 pm config set editor 设置默认编辑器`)
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
  .description('配置管理 - 查看和修改 Project Mate 的配置项\n提示：使用 pm config --help 查看详细用法')
  .addHelpText('after', `
  命令用法:
    pm config                    # 显示配置管理帮助
    pm config get [key]          # 获取配置
    pm config set <key> <value>  # 设置配置

  配置项说明:
    editor      默认编辑器，如: code, vim, idea
    projects    项目根目录列表
    gitlab      GitLab 相关配置

  使用示例:
    1. 查看配置
       pm config get              # 显示所有配置
       pm config get editor       # 查看编辑器配置
       pm config get projects     # 查看项目目录配置

    2. 修改配置
       pm config set editor code  # 设置编辑器为 VS Code
       pm config set editor vim   # 设置编辑器为 Vim

  提示:
    - 配置文件保存在 ~/.pm/config.json
    - 编辑器设置影响 pm open 命令
    - 项目目录影响项目搜索范围`)
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
  .description('分支管理 - 管理 Git 分支的描述和搜索\n提示：使用 pm br --help 查看详细用法')
  .addHelpText('after', `
  命令用法:
    pm br                         # 显示分支管理帮助信息
    pm br set [branch] [desc]     # 设置分支描述
    pm br list                    # 列出所有分支
    pm br search <keyword>        # 搜索分支

  子命令详解:
    1. set   - 设置分支描述
       pm br set "修复登录bug"     # 为当前分支添加描述
       pm br set dev "开发分支"    # 为指定分支添加描述
       pm br set "紧急修复"        # 为当前分支添加描述

    2. list  - 查看分支列表
       pm br list                 # 显示所有带描述的分支
       
    3. search - 搜索分支
       pm br search bug           # 搜索分支名或描述中包含"bug"的分支
       pm br search feature       # 搜索功能分支
       pm br search "登录"        # 搜索与登录相关的分支

  提示:
    - 分支描述支持中文和特殊字符
    - 搜索时支持模糊匹配
    - 当前分支会用 * 标记
    - 描述中的空格需要用引号包裹`)
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
  .description('运行 package.json 中的脚本命令 - 交互式选择并运行 npm 脚本\n提示：使用 pm run --help 查看详细用法')
  .addHelpText('after', `
  命令用法:
    pm run                      # 交互式运行 npm 脚本

  功能说明:
    - 自动检测 package.json 中的可用脚本
    - 提供交互式界面选择要运行的脚本
    - 显示脚本命令的具体内容

  使用示例:
    pm run                      # 启动交互式脚本选择器

  提示:
    - 需要在包含 package.json 的目录下运行
    - 支持方向键选择脚本
    - 显示脚本实际执行的命令
    - 可以随时按 Ctrl+C 退出`)
  .action(async () => {
    try {
      await listAndRunScript();
    } catch (error) {
      console.error(chalk.red('运行脚本失败：'), error);
    }
  });

program.parse(process.argv);
