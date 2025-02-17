import { exec } from 'child_process';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { glob } from 'glob';
import os from 'os';
import axios from 'axios';
import { getConfigValue } from './config';
import { GitRepository, SearchMatch } from '../types';

// 排除的目录
const EXCLUDED_DIRS = ['node_modules', 'dist', '.git', 'coverage'];

// 进度显示
function updateProgress(current: number, total: number) {
  process.stdout.write(`\r${chalk.gray(`已处理 ${current} / ${total} 个文件...`)}`);
}

// 搜索本地项目
async function searchLocalProjects(keyword: string): Promise<void> {
  const rootDir = await getConfigValue('local-project-root-directory');
  if (!rootDir) {
    console.error(chalk.red('错误：未配置本地项目根目录'));
    return;
  }

  console.log(chalk.blue(`\n正在搜索本地项目，关键词：${keyword}`));
  const matches = await searchFilesInDirectory(rootDir, keyword);
  await displaySearchResults(matches);
}

// 搜索 GitLab 项目
async function searchGitLabProjects(keyword: string): Promise<void> {
  const token = await getConfigValue('gitlab-token');
  const apiUrl = await getConfigValue('gitlab-api-url');

  if (!token || !apiUrl) {
    console.error(chalk.red('错误：未配置 GitLab Token 或 API URL'));
    return;
  }

  try {
    const api = axios.create({
      baseURL: apiUrl,
      headers: { 'PRIVATE-TOKEN': token }
    });

    console.log(chalk.blue(`\n正在搜索 GitLab 项目，关键词：${keyword}`));
    const response = await api.get<GitRepository[]>('/projects', {
      params: {
        search: keyword,
        order_by: 'last_activity_at',
        sort: 'desc'
      }
    });

    const projects = response.data;
    if (projects.length === 0) {
      console.log(chalk.yellow('未找到匹配的项目'));
      return;
    }

    // 创建选择列表
    const choices = projects.map(project => ({
      name: `${chalk.green(project.name)} ${chalk.gray(project.description || '')}`,
      value: project,
      short: project.name
    }));

    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: '选择要克隆的项目：',
        choices,
        pageSize: 10
      }
    ]);

    // 获取本地项目根目录
    const rootDir = await getConfigValue('local-project-root-directory');
    if (!rootDir) {
      console.error(chalk.red('错误：未配置本地项目根目录'));
      return;
    }

    // 克隆项目
    const targetDir = path.join(rootDir, selectedProject.name);
    console.log(chalk.blue(`\n正在克隆项目到：${targetDir}`));
    
    const command = `git clone ${selectedProject.http_url_to_repo} "${targetDir}"`;
    exec(command, (error) => {
      if (error) {
        console.error(chalk.red('克隆项目失败：'), error);
      } else {
        console.log(chalk.green('项目克隆成功！'));
      }
    });
  } catch (error) {
    console.error(chalk.red('搜索 GitLab 项目失败：'), error);
  }
}

// 搜索项目
export async function searchProjects(keyword: string, useGitLab: boolean = false): Promise<void> {
  if (useGitLab) {
    await searchGitLabProjects(keyword);
  } else {
    await searchLocalProjects(keyword);
  }
}

// 搜索目录中的文件
async function searchFilesInDirectory(rootDir: string, keyword: string): Promise<SearchMatch[]> {
  const results: SearchMatch[] = [];
  let filesProcessed = 0;

  // 创建工作线程池
  const numWorkers = Math.max(1, os.cpus().length - 1);
  const workers: Worker[] = [];
  const pendingResults: Promise<SearchMatch[]>[] = [];

  // 获取所有文件
  const files = await new Promise<string[]>((resolve, reject) => {
    glob('**/*', {
      cwd: rootDir,
      ignore: EXCLUDED_DIRS,
      nodir: true,
      absolute: true
    }).then(resolve).catch(reject);
  });

  // 将文件分配给工作线程
  const filesPerWorker = Math.ceil(files.length / numWorkers);
  for (let i = 0; i < numWorkers; i++) {
    const workerFiles = files.slice(i * filesPerWorker, (i + 1) * filesPerWorker);
    const worker = new Worker(__filename, {
      workerData: {
        files: workerFiles,
        keyword,
        isWorker: true
      }
    });

    workers.push(worker);
    pendingResults.push(
      new Promise<SearchMatch[]>((resolve, reject) => {
        const results: SearchMatch[] = [];
        worker.on('message', (match: SearchMatch) => {
          results.push(match);
          filesProcessed++;
          updateProgress(filesProcessed, files.length);
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code === 0) resolve(results);
          else reject(new Error(`Worker stopped with exit code ${code}`));
        });
      })
    );
  }

  try {
    const workerResults = await Promise.all(pendingResults);
    results.push(...workerResults.flat());
  } finally {
    workers.forEach(worker => worker.terminate());
  }

  return results;
}

// 搜索单个文件
async function searchFile(filePath: string, keyword: string): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
        matches.push({
          path: filePath,
          type: 'file',
          line: i + 1,
          content: lines[i].trim()
        });
      }
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  return matches;
}

// 显示搜索结果
async function displaySearchResults(matches: SearchMatch[]): Promise<void> {
  if (matches.length === 0) {
    console.log(chalk.yellow('未找到匹配的项目'));
    return;
  }

  // 按文件分组结果
  const groupedMatches = matches.reduce<Record<string, SearchMatch[]>>((acc, curr) => {
    if (!acc[curr.path]) {
      acc[curr.path] = [];
    }
    acc[curr.path].push(curr);
    return acc;
  }, {});

  // 创建选择列表
  const choices = Object.entries(groupedMatches).map(([filePath, matches]) => ({
    name: `${chalk.green(filePath)} ${chalk.gray(`(${matches.length} matches)`)}`,
    value: matches[0],
    short: filePath
  }));

  const { selectedMatch } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedMatch',
      message: '选择要打开的文件：',
      choices,
      pageSize: 10
    }
  ]);

  // 使用 windsurf 打开选中的文件
  try {
    const command = `windsurf --goto "${selectedMatch.path}:${selectedMatch.line}"`;
    exec(command, (error) => {
      if (error) {
        console.error(chalk.red('打开文件失败：'), error);
      }
    });
  } catch (error) {
    console.error(chalk.red('执行命令失败：'), error);
  }
}

// 工作线程处理函数
async function workerProcess(files: string[], keyword: string) {
  const results: SearchMatch[] = [];
  for (const file of files) {
    const matches = await searchFile(file, keyword);
    results.push(...matches);
  }
  return results;
}

if (!isMainThread && workerData?.isWorker) {
  const { files, keyword } = workerData;
  workerProcess(files, keyword).then(results => {
    results.forEach(result => parentPort?.postMessage(result));
    process.exit(0);
  }).catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
  });
}
