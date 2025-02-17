#!/usr/bin/env node

import { program } from 'commander';
import { searchProjects } from '../lib/search';
import { setConfig, getConfig, getConfigValue, getConfigKeys } from '../lib/config';
import { Config } from '../types';
import chalk from 'chalk';
import { 
  setBranchDescription, 
  listBranchesWithDescription, 
  searchBranches,
  getCurrentBranch
} from '../lib/branch';

program
  .version('1.0.0')
  .description('项目管理工具');

// 搜索命令
program
  .command('search <keyword>')
  .option('-g, --git', '在远程Git仓库中搜索')
  .description('搜索项目')
  .action(async (keyword: string, options: { git?: boolean }) => {
    await searchProjects(keyword, options);
  });

// 配置管理命令
program
  .command('config')
  .description('配置管理')
  .addCommand(
    program
      .command('set <key> <value>')
      .description('设置配置项')
      .action(async (key: string, value: string) => {
        try {
          const validKeys = getConfigKeys();
          if (!validKeys.includes(key as any)) {
            console.error(chalk.red('错误：无效的配置项'));
            console.log(chalk.yellow('可用的配置项：'));
            validKeys.forEach(k => console.log(chalk.blue(`  - ${k}`)));
            return;
          }
          await setConfig(key as keyof Config, value);
        } catch (error) {
          console.error(chalk.red('设置配置失败：'), error);
        }
      })
  )
  .addCommand(
    program
      .command('get <key>')
      .description('获取配置项的值')
      .action(async (key: string) => {
        try {
          const validKeys = getConfigKeys();
          if (!validKeys.includes(key as any)) {
            console.error(chalk.red('错误：无效的配置项'));
            console.log(chalk.yellow('可用的配置项：'));
            validKeys.forEach(k => console.log(chalk.blue(`  - ${k}`)));
            return;
          }
          const value = await getConfigValue(key as keyof Config);
          console.log(chalk.green(`${key}: ${value}`));
        } catch (error) {
          console.error(chalk.red('获取配置失败：'), error);
        }
      })
  )
  .addCommand(
    program
      .command('list')
      .description('列出所有配置项')
      .action(async () => {
        try {
          const config = await getConfig();
          console.log(chalk.yellow('当前配置：'));
          Object.entries(config).forEach(([key, value]) => {
            if (key === 'gitlab-token') {
              console.log(chalk.blue(`  ${key}: ${value ? '已设置' : '未设置'}`));
            } else {
              console.log(chalk.blue(`  ${key}: ${value}`));
            }
          });
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
          console.log(chalk.yellow(`正在搜索包含 "${keyword}" 的分支...`));
          const results = await searchBranches(keyword);
          
          if (results.length === 0) {
            console.log(chalk.yellow('未找到匹配的分支'));
            return;
          }

          console.log(chalk.yellow('\n搜索结果：'));
          results.forEach(({ repo, branches }) => {
            console.log(chalk.blue(`\n仓库: ${repo}`));
            branches.forEach(({ branch, description, matched }) => {
              const matchType = matched === 'both' ? '分支名和备注' : 
                              matched === 'name' ? '分支名' : '备注';
              console.log(chalk.green(`  ${branch}`));
              if (description) {
                console.log(chalk.gray(`    备注: ${description}`));
              }
              console.log(chalk.gray(`    匹配: ${matchType}`));
            });
          });
        } catch (error) {
          console.error(chalk.red('搜索分支失败：'), error);
        }
      })
  );

program.parse(process.argv);
