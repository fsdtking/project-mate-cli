import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs/promises';
import { getConfig } from './config';
import { glob } from 'glob';
import inquirer from 'inquirer';
import { openWithEditor } from './editor';

// 创建进度条
function createProgressBar(current: number, total: number, width: number = 30): string {
  const progress = Math.floor((current / total) * width);
  const percentage = Math.floor((current / total) * 100);
  const filled = '='.repeat(progress);
  const empty = '-'.repeat(width - progress);
  return `[${filled}${empty}] ${percentage}%`;
}

// 获取当前分支名
export async function getCurrentBranch(cwd: string = process.cwd()): Promise<string> {
  const git = simpleGit(cwd);
  return await git.revparse(['--abbrev-ref', 'HEAD']);
}

// 设置分支备注
export async function setBranchDescription(description: string, branchName?: string, cwd: string = process.cwd()): Promise<void> {
  const git = simpleGit(cwd);
  
  // 如果没有提供分支名，使用当前分支
  if (!branchName) {
    branchName = await getCurrentBranch(cwd);
  }

  try {
    await git.raw(['config', `branch.${branchName}.description`, description]);
    console.log(chalk.green(`已为分支 ${chalk.blue(branchName)} 添加备注：${chalk.yellow(description)}`));
  } catch (error) {
    console.error(chalk.red('设置分支备注失败：'), error);
    throw error;
  }
}

// 获取分支备注
export async function getBranchDescription(branchName: string, cwd: string = process.cwd()): Promise<string> {
  const git = simpleGit(cwd);
  try {
    return await git.raw(['config', `branch.${branchName}.description`]);
  } catch {
    return '';
  }
}

// 列出所有带备注的分支
export async function listBranchesWithDescription(cwd: string = process.cwd()): Promise<Array<{ branch: string; description: string }>> {
  const git = simpleGit(cwd);
  const branches = await git.branchLocal();
  const results: Array<{ branch: string; description: string }> = [];

  for (const branch of branches.all) {
    const description = (await getBranchDescription(branch, cwd)).trim();
    if (description) {
      results.push({ branch, description });
    }
  }

  return results;
}

// 检查是否有未提交的更改
async function hasUncommittedChanges(git: SimpleGit): Promise<boolean> {
  const status = await git.status();
  return status.files.length > 0;
}

// 在所有本地仓库中搜索分支并提供交互式选择
export async function searchBranches(keyword: string): Promise<void> {
  console.log(chalk.yellow('正在搜索分支...'));
  try {
    const config = await getConfig();
    const rootDir = config['local-project-root-directory'];
    const results: Array<{ 
      repo: string; 
      branches: Array<{
        branch: string;
        description: string;
        matched: 'name' | 'description' | 'both';
      }> 
    }> = [];

    // 查找所有 .git 目录
    const gitDirs = await glob('**/.git', {
      cwd: rootDir,
      ignore: ['**/node_modules/**'],
      absolute: true
    });

    let processedCount = 0;
    const totalCount = gitDirs.length;

    for (const gitDir of gitDirs) {
      const repoPath = path.dirname(gitDir);
      const git = simpleGit(repoPath);
      
      try {
        // 显示进度
        processedCount++;
        const progressBar = createProgressBar(processedCount, totalCount);
        process.stdout.write(`\r${chalk.blue(progressBar)} 已处理: ${processedCount}/${totalCount} 当前: ${path.basename(repoPath)}${' '.repeat(20)}`);

        // 检查是否是有效的 git 仓库
        const isRepo = await git.checkIsRepo();
        if (!isRepo) continue;

        const branches = await git.branchLocal();
        const matchedBranches: Array<{
          branch: string;
          description: string;
          matched: 'name' | 'description' | 'both';
        }> = [];

        for (const branch of branches.all) {
          const description = (await getBranchDescription(branch, repoPath)).trim();
          const branchMatches = branch.toLowerCase().includes(keyword.toLowerCase());
          const descriptionMatches = description.toLowerCase().includes(keyword.toLowerCase());

          if (branchMatches || descriptionMatches) {
            matchedBranches.push({
              branch,
              description,
              matched: branchMatches && descriptionMatches ? 'both' : 
                      branchMatches ? 'name' : 'description'
            });
          }
        }

        if (matchedBranches.length > 0) {
          results.push({
            repo: repoPath,  // 使用完整路径以便后续切换
            branches: matchedBranches
          });
        }
      } catch (error) {
        console.error(chalk.yellow(`警告: 处理仓库 ${repoPath} 时出错`), error);
        continue;
      }
    }

    process.stdout.write('\n');
    console.log(chalk.green('搜索完成'));

    // 将结果转换为选择列表的格式
    const choices = results.flatMap(result =>
      result.branches.map(branch => ({
        name: `${chalk.blue(path.basename(result.repo))} - ${chalk.green(branch.branch)}${branch.description ? ` (${chalk.yellow(branch.description)})` : ''}`,
        value: {
          repo: result.repo,
          branch: branch.branch
        }
      }))
    );

    if (choices.length === 0) {
      console.log(chalk.yellow('未找到匹配的分支'));
      return;
    }

    // 使用 inquirer 提供交互式选择
    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message: '请选择要切换的分支：',
        choices,
        pageSize: 10
      }
    ]);

    // 检查目标仓库的状态
    const git = simpleGit(selection.repo);
    const hasChanges = await hasUncommittedChanges(git);

    if (hasChanges) {
      console.log(chalk.red('警告：当前分支有未提交的更改。'));
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '是否继续切换分支？',
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('已取消切换分支'));
        return;
      }
    }

    // 切换分支
    console.log(chalk.yellow('正在切换分支...'));
    try {
      await git.checkout(selection.branch);
      console.log(chalk.green(`已成功切换到分支：${selection.branch}`));
      
      // 使用默认编辑器打开项目
      await openWithEditor(selection.repo);
    } catch (error) {
      console.error(chalk.red('切换分支失败'));
      console.error(chalk.red('错误：'), error);
    }
  } catch (error) {
    console.error(chalk.red('搜索失败'));
    console.error(chalk.red('错误：'), error);
  }
}
