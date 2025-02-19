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

// 检查工作区状态
interface WorkingDirStatus {
  hasUncommitted: boolean;
  hasUntracked: boolean;
  hasStaged: boolean;
  hasMergeConflicts: boolean;
}

async function getWorkingDirStatus(git: SimpleGit): Promise<WorkingDirStatus> {
  const status = await git.status();
  return {
    hasUncommitted: status.modified.length > 0 || status.deleted.length > 0,
    hasUntracked: status.not_added.length > 0,
    hasStaged: status.staged.length > 0,
    hasMergeConflicts: status.conflicted.length > 0
  };
}

// 保存当前工作区
async function stashChanges(git: SimpleGit, branchName: string): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stashMessage = `pm_auto_stash_${branchName}_${timestamp}`;
    await git.stash(['push', '-u', '-m', stashMessage]);
    console.log(chalk.green('已自动保存工作区更改'));
    return true;
  } catch (error) {
    console.error(chalk.red('保存工作区失败：'), error);
    return false;
  }
}

// 恢复工作区
async function popStashedChanges(git: SimpleGit): Promise<boolean> {
  try {
    await git.stash(['pop']);
    console.log(chalk.green('已恢复工作区更改'));
    return true;
  } catch (error) {
    console.error(chalk.red('恢复工作区失败，请手动处理：'), error);
    return false;
  }
}

// 检查分支是否存在
async function checkBranchExists(git: SimpleGit, branchName: string): Promise<boolean> {
  const branches = await git.branchLocal();
  return branches.all.includes(branchName);
}

// 检查分支是否是最新的
async function isUpToDate(git: SimpleGit, branchName: string): Promise<boolean> {
  try {
    await git.fetch();
    const status = await git.status();
    return !status.behind;
  } catch {
    return false;
  }
}

// 切换分支
export async function switchBranch(repoPath: string, targetBranch: string): Promise<boolean> {
  const git = simpleGit(repoPath);
  let stashed = false;

  try {
    // 1. 检查分支是否存在
    if (!await checkBranchExists(git, targetBranch)) {
      console.error(chalk.red(`错误：分支 ${targetBranch} 不存在`));
      return false;
    }

    // 2. 检查工作区状态
    const status = await getWorkingDirStatus(git);
    
    // 3. 如果有合并冲突，阻止切换
    if (status.hasMergeConflicts) {
      console.error(chalk.red('错误：当前分支有未解决的合并冲突，请先解决冲突'));
      return false;
    }

    // 4. 如果有未提交的更改，提供选项
    if (status.hasUncommitted || status.hasUntracked || status.hasStaged) {
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: '检测到未提交的更改，请选择操作：',
        choices: [
          { name: '自动保存更改并切换分支 (推荐)', value: 'stash' },
          { name: '放弃更改并切换分支', value: 'discard' },
          { name: '取消操作', value: 'cancel' }
        ]
      }]);

      if (action === 'cancel') {
        console.log(chalk.yellow('已取消切换分支'));
        return false;
      }

      if (action === 'stash') {
        stashed = await stashChanges(git, targetBranch);
        if (!stashed) {
          console.error(chalk.red('自动保存更改失败，已取消切换'));
          return false;
        }
      } else if (action === 'discard') {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: chalk.red('警告：此操作将丢失所有未提交的更改，确定继续吗？'),
          default: false
        }]);

        if (!confirm) {
          console.log(chalk.yellow('已取消切换分支'));
          return false;
        }
        await git.reset(['--hard']);
        await git.clean(['--force', '-d']);
      }
    }

    // 5. 检查分支是否需要更新
    if (!await isUpToDate(git, targetBranch)) {
      console.log(chalk.yellow('提示：目标分支可能不是最新版本，建议切换后执行 git pull'));
    }

    // 6. 执行分支切换
    await git.checkout(targetBranch);
    console.log(chalk.green(`已成功切换到分支：${chalk.blue(targetBranch)}`));

    // 7. 如果之前有 stash，尝试恢复
    if (stashed) {
      await popStashedChanges(git);
    }

    return true;
  } catch (error) {
    console.error(chalk.red('切换分支失败：'), error);
    
    // 如果失败且之前有 stash，提醒用户
    if (stashed) {
      console.log(chalk.yellow('\n您的更改已被保存在 stash 中，可以使用以下命令恢复：'));
      console.log(chalk.blue('git stash pop'));
    }
    
    return false;
  }
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

    // 使用优化后的分支切换功能
    const success = await switchBranch(selection.repo, selection.branch);
    
    if (success) {
      // 如果是 VS Code，询问是否要在新窗口打开
      const { openInNewWindow } = await inquirer.prompt([{
        type: 'confirm',
        name: 'openInNewWindow',
        message: '是否在编辑器中打开该项目？',
        default: true
      }]);

      if (openInNewWindow) {
        await openWithEditor(selection.repo);
      }
    }
  } catch (error) {
    console.error(chalk.red('搜索失败'));
    console.error(chalk.red('错误：'), error);
  }
}
