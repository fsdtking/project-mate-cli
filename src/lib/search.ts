import { exec } from 'child_process';
import fs from 'fs/promises';
import { Stats } from 'fs';
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
  const width = 30;
  const filled = Math.round(width * (current / total));
  const empty = width - filled;
  const progressBar = `[${'='.repeat(filled)}${'-'.repeat(empty)}]`;
  const shortPath = currentFile.split('/').slice(-2).join('/');
  
  // Clear the current line
  process.stdout.write('\r\x1b[K');
  
  // Write the new progress
  const line = `${chalk.gray(progressBar)} ${chalk.yellow(`${percentage}%`)} ${chalk.gray(`已处理 ${current}/${total} 个文件`)} ${chalk.cyan(shortPath)}`;
  process.stdout.write(line);
  
  if (current === total) {
    process.stdout.write('\n');
  }
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

// 文件大小和超时配置
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const SEARCH_TIMEOUT = 5 * 60 * 1000;     // 5分钟

// 搜索目录中的文件
async function searchFilesInDirectory(rootDir: string, keyword: string): Promise<SearchMatch[]> {
  const results: SearchMatch[] = [];
  let filesProcessed = 0;
  let totalSize = 0;
  let startTime = Date.now();  // 改用 let 声明

  // 创建一个用于检查超时的函数
  const checkTimeout = async (): Promise<boolean> => {
    const currentTime = Date.now();
    if (currentTime - startTime > SEARCH_TIMEOUT) {
      const { continueSearch } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continueSearch',
        message: '搜索已经超过5分钟，是否继续搜索？',
        default: false
      }]);
      
      if (!continueSearch) {
        console.log(chalk.yellow('\n搜索已取消'));
        return true;
      }
      // 重置计时器
      startTime = Date.now();
    }
    return false;
  };

  try {
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

    const totalFiles = files.length;
    console.log(chalk.gray(`找到 ${totalFiles} 个文件待搜索`));

    // 批量处理文件
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      // 检查是否超时
      if (await checkTimeout()) {
        break;
      }

      const batchPromises = batch.map(async (file) => {
        try {
          const stat = await fs.stat(file);
          
          // 检查文件大小
          if (stat.size > FILE_SIZE_LIMIT) {
            console.log(chalk.yellow(`\n跳过大文件：${file} (${(stat.size / 1024 / 1024).toFixed(2)}MB)`));
            filesProcessed++;
            updateProgress(filesProcessed, totalFiles, file);
            return [];
          }

          totalSize += stat.size;
          const matches = await searchFile(file, keyword);
          filesProcessed++;
          updateProgress(filesProcessed, totalFiles, file);
          return matches;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(chalk.red(`\n处理文件 ${file} 时出错: ${errorMessage}`));
          filesProcessed++;
          updateProgress(filesProcessed, totalFiles, file);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    // 显示搜索统计信息
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(chalk.gray(`\n搜索完成：处理了 ${filesProcessed} 个文件，总大小 ${totalSizeMB}MB，用时 ${duration} 秒`));

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('\n搜索过程中发生错误:', errorMessage));
    return results;
  }
}

// 搜索单个文件
async function searchFile(filePath: string, keyword: string): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];

  try {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.code === 'EACCES') {
        return matches;
      }
      throw new Error(`无法读取文件 ${filePath}: ${error.message}`);
    }

    // 使用更高效的字符串搜索
    const lines = content.split('\n');
    const lowerKeyword = keyword.toLowerCase();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes(lowerKeyword)) {
        matches.push({
          path: filePath,
          type: 'file',
          line: i + 1,
          content: line.trim()
        });
      }
    }

    return matches;
  } catch (error) {
    // 只记录非预期的错误
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    } else {
      console.error(chalk.red(`处理文件 ${filePath} 时发生未知错误`));
    }
    return matches;
  }
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
  const errors: string[] = [];

  for (const file of files) {
    try {
      const matches = await searchFile(file, keyword);
      results.push(...matches);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`处理文件 ${file} 时出错: ${errorMessage}`);
    }
  }

  if (errors.length > 0) {
    console.error(chalk.red('搜索过程中发生以下错误:'));
    errors.forEach(err => console.error(chalk.red(`- ${err}`)));
    process.exitCode = 1;
  }

  return results;
}

// 移除工作线程入口点代码，因为我们现在使用异步函数替代
