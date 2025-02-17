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
import { openWithEditor } from './editor';

// 排除的目录和文件
const EXCLUDED_DIRS = [
  'node_modules',
  'dist',
  '.git',
  'coverage',
  'build',
  'public',
  '.idea',
  '.vscode',
  '.next',
  '.nuxt',
  'vendor',
  'tmp',
  'temp',
  'logs'
];

const EXCLUDED_FILES = [
  '*.min.js',
  '*.min.css',
  '*.map',
  '*.bundle.js',
  '*.chunk.js',
  '*.test.js',
  '*.spec.js',
  '*.d.ts',
  '*.ico',
  '*.jpg',
  '*.jpeg',
  '*.png',
  '*.gif',
  '*.svg',
  '*.woff',
  '*.woff2',
  '*.ttf',
  '*.eot',
  '*.mp4',
  '*.webm',
  '*.pdf',
  '*.zip',
  '*.tar.gz',
  '*.tgz',
  'package-lock.json',
  'yarn.lock',
  '.DS_Store'
];

// 可搜索的文件扩展名
const SEARCHABLE_EXTENSIONS = [
  // 前端文件
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.htm', '.css', '.scss', '.less', '.sass',
  '.svelte', '.astro', '.angular', '.ng', '.mjs', '.cjs',
  
  // 服务端文件
  '.php', '.py', '.rb', '.java', '.go', '.rs', '.cs', '.cpp', '.c', '.h', '.hpp',
  '.scala', '.kt', '.kts', '.groovy', '.pl', '.pm', '.t',
  
  // 配置文件
  '.json', '.xml', '.yml', '.yaml', '.toml', '.ini', '.conf', '.config',
  '.properties', '.env', '.env.*', '.editorconfig', '.babelrc', '.eslintrc',
  
  // 模板文件
  '.ejs', '.pug', '.jade', '.hbs', '.mustache', '.twig', '.liquid',
  
  // 数据库文件
  '.sql', '.prisma', '.graphql', '.gql',
  
  // 文档文件
  '.md', '.mdx', '.txt', '.rtf', '.csv', '.tsv',
  
  // 脚本文件
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  
  // 其他源代码文件
  '.swift', '.m', '.mm', '.r', '.dart', '.ex', '.exs', '.erl', '.hrl',
  '.clj', '.cljc', '.cljs', '.lua', '.tcl', '.vb', '.fs', '.fsx',
  
  // 移动端文件
  '.swift', '.kt', '.java', '.m', '.h',
  
  // 系统配置文件
  '.plist', '.reg'
];

// 进度显示
function updateProgress(current: number, total: number, currentFile: string) {
  const percentage = Math.round((current / total) * 100);
  const shortPath = currentFile.split('/').slice(-2).join('/');
  process.stdout.write(
    `\r${chalk.gray(`[${percentage}%] 已处理 ${current}/${total} 个文件`)} ${chalk.cyan(shortPath)}${' '.repeat(20)}`
  );
}

// 搜索本地项目
async function searchLocalProjects(keyword: string): Promise<void> {
  const rootDir = await getConfigValue('local-project-root-directory');
  if (!rootDir) {
    console.error(chalk.red('错误：未配置本地项目根目录'));
    return;
  }

  console.log(chalk.blue(`\n正在搜索本地项目，关键词：${keyword}`));
  console.log(chalk.gray('初始化搜索...'));
  
  const startTime = Date.now();
  const matches = await searchFilesInDirectory(rootDir, keyword);
  const endTime = Date.now();
  
  process.stdout.write('\r' + ' '.repeat(100) + '\r'); // 清除进度行
  console.log(chalk.gray(`\n搜索完成，用时 ${((endTime - startTime) / 1000).toFixed(2)} 秒`));
  
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
  let currentFile = '';

  // 创建工作线程池
  const numWorkers = Math.max(2, os.cpus().length - 1); // 至少使用2个线程
  const workers: Worker[] = [];
  const pendingResults: Promise<SearchMatch[]>[] = [];

  console.log(chalk.gray(`使用 ${numWorkers} 个线程进行搜索...`));

  // 获取所有文件
  const files = await new Promise<string[]>((resolve, reject) => {
    glob('**/*', {
      cwd: rootDir,
      ignore: [...EXCLUDED_DIRS.map(dir => `**/${dir}/**`), ...EXCLUDED_FILES],
      nodir: true,
      absolute: true,
      follow: false  // 不跟踪符号链接
    }).then(files => {
      // 只保留可搜索的文件类型
      const filteredFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return SEARCHABLE_EXTENSIONS.includes(ext);
      });
      resolve(filteredFiles);
    }).catch(reject);
  });

  console.log(chalk.gray(`找到 ${files.length} 个文件待搜索`));

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
        const workerResults: SearchMatch[] = [];
        worker.on('message', (data: { match?: SearchMatch; currentFile?: string }) => {
          if (data.match) {
            workerResults.push(data.match);
          }
          if (data.currentFile) {
            currentFile = data.currentFile;
          }
          filesProcessed++;
          updateProgress(filesProcessed, files.length, currentFile);
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code === 0) resolve(workerResults);
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
    // 检查文件是否存在且可访问
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        return matches;
      }
    } catch (error) {
      // 忽略文件不存在或无法访问的错误
      if ((error as any).code === 'ENOENT') {
        return matches;
      }
      throw error;
    }

    // 检查文件大小
    const stat = await fs.stat(filePath);
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB
    if (stat.size > MAX_FILE_SIZE) {
      return matches;
    }

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
    // 忽略特定类型的错误
    const errorCode = (error as any).code;
    if (!['EISDIR', 'ENOENT', 'EACCES'].includes(errorCode)) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }
  return matches;
}

// 显示搜索结果
async function displaySearchResults(matches: SearchMatch[]): Promise<void> {
  if (matches.length === 0) {
    console.log(chalk.yellow('未找到匹配的内容'));
    return;
  }

  // 按文件路径分组
  const groupedMatches = matches.reduce((groups, match) => {
    const key = match.path;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(match);
    return groups;
  }, {} as Record<string, SearchMatch[]>);

  // 创建选择列表
  const choices = Object.entries(groupedMatches).map(([path, matches]) => {
    const relativePath = path.split('/').slice(-3).join('/');
    const preview = matches.map(m => chalk.gray(`[${m.line}] ${m.content || ''}`.slice(0, 60) + '...')).join('\n    ');
    return {
      name: `${chalk.green(relativePath)}\n    ${preview}`,
      value: path,
      short: relativePath
    };
  });

  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: '选择要打开的文件：',
      choices,
      pageSize: 10
    }
  ]);

  // 使用配置的编辑器打开选中的文件
  try {
    await openWithEditor(selectedFile);
  } catch (error) {
    console.error(chalk.red('打开文件失败：'), error);
  }
}

// 工作线程处理函数
async function workerProcess(files: string[], keyword: string): Promise<SearchMatch[]> {
  const results: SearchMatch[] = [];
  for (const file of files) {
    parentPort?.postMessage({ currentFile: file });
    const matches = await searchFile(file, keyword);
    matches.forEach(match => parentPort?.postMessage({ match }));
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
