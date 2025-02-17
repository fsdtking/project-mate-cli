import simpleGit from 'simple-git';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs/promises';
import { getConfig } from './config';
import { glob } from 'glob';

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

// 在所有本地仓库中搜索分支
export async function searchBranches(keyword: string): Promise<Array<{ 
  repo: string;
  branches: Array<{ 
    branch: string; 
    description: string;
    matched: 'name' | 'description' | 'both';
  }> 
}>> {
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

  for (const gitDir of gitDirs) {
    const repoPath = path.dirname(gitDir);
    const git = simpleGit(repoPath);
    
    try {
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
          repo: path.relative(rootDir, repoPath),
          branches: matchedBranches
        });
      }
    } catch (error) {
      console.error(chalk.yellow(`警告: 处理仓库 ${repoPath} 时出错`), error);
      continue;
    }
  }

  return results;
}
