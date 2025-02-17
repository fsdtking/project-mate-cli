import { glob } from 'glob';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';
import { Config, SearchMatch, GitRepository } from '../types';
import { exec } from 'child_process';

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, '../../pm_config.json');

// 读取配置文件
async function getConfig(): Promise<Config> {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(chalk.red('读取配置文件失败：'), error);
    // 返回默认配置
    return {
      'git-remote-address': 'https://github.com/',
      'local-project-root-directory': process.cwd(),
      'gitlab-token': '',
      'gitlab-api-url': 'https://gitlab.com/api/v4'
    };
  }
}

// 要排除的目录
const EXCLUDED_DIRS: string[] = [
  'node_modules',
  'dist',
  '.cache',
  '.next',
  'build',
  '.git',
  'coverage'
];

// 要搜索的文件类型
const SEARCHABLE_EXTENSIONS: string[] = [
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', 
  '.json', '.md', '.txt', '.yml', '.yaml', '.xml'
];

async function searchInFile(filePath: string, keyword: string): Promise<SearchMatch[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
        matches.push({
          line: i + 1,
          content: lines[i].trim(),
          file: filePath
        });
      }
    }

    return matches;
  } catch (error) {
    console.error(chalk.red(`Error reading file ${filePath}:`, error));
    return [];
  }
}

async function* walkDirectory(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        yield* walkDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SEARCHABLE_EXTENSIONS.includes(ext)) {
        yield fullPath;
      }
    }
  }
}

interface SearchResult {
  index: number;
  file: string;
  matches: SearchMatch[];
}

async function searchLocalProjects(keyword: string): Promise<void> {
  const config = await getConfig();
  const rootDir = config['local-project-root-directory'];
  const results: SearchMatch[] = [];
  let filesProcessed = 0;

  console.log(chalk.yellow('正在搜索文件...'));

  try {
    for await (const filePath of walkDirectory(rootDir)) {
      const matches = await searchInFile(filePath, keyword);
      if (matches.length > 0) {
        results.push(...matches);
      }
      filesProcessed++;
      
      if (filesProcessed % 100 === 0) {
        process.stdout.write(`\r${chalk.gray(`已处理 ${filesProcessed} 个文件...`)}`);
      }
    }

    process.stdout.write('\n');

    if (results.length === 0) {
      console.log(chalk.yellow('未找到匹配的内容'));
      return;
    }

    // 按文件分组并格式化结果
    const groupedResults = results.reduce<Record<string, SearchMatch[]>>((acc, curr) => {
      if (!acc[curr.file]) {
        acc[curr.file] = [];
      }
      acc[curr.file].push(curr);
      return acc;
    }, {});

    // 转换为数组格式，方便展示和选择
    const searchResults: SearchResult[] = Object.entries(groupedResults).map(
      ([file, matches], index) => ({
        index: index + 1,
        file,
        matches
      })
    );

    // 显示文件匹配预览
    searchResults.forEach(result => {
      console.log(chalk.green(`\n${result.index}. 文件：`) + chalk.cyan(path.relative(rootDir, result.file)));
      result.matches.forEach(match => {
        console.log(chalk.yellow(`   第 ${match.line} 行: `) + match.content);
      });
    });

    console.log(chalk.green(`\n共找到 ${results.length} 个匹配项，在 ${searchResults.length} 个文件中`));
    console.log(chalk.yellow('\n请选择要打开的文件（使用上下键选择或输入序号）：'));

    // 创建选择列表
    const choices = searchResults.map(result => ({
      name: `${result.index}. ${chalk.cyan(path.relative(rootDir, result.file))} ${chalk.gray(`(${result.matches.length} 处匹配)`)}`,
      value: result,
      short: path.relative(rootDir, result.file)
    }));

    // 使用 inquirer 进行交互式选择
    const { selectedResult } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedResult',
        message: '选择要打开的文件：',
        choices,
        pageSize: 10
      }
    ]);

    // 如果有多个匹配项，让用户选择具体位置
    let selectedMatch: SearchMatch;
    if (selectedResult.matches.length > 1) {
      const { match } = await inquirer.prompt([
        {
          type: 'list',
          name: 'match',
          message: '选择要跳转的位置：',
          choices: selectedResult.matches.map((match: SearchMatch) => ({
            name: `第 ${match.line} 行: ${match.content}`,
            value: match
          }))
        }
      ]);
      selectedMatch = match;
    } else {
      selectedMatch = selectedResult.matches[0];
    }

    // 使用 Windsurf 打开文件
    const command = `windsurf --goto "${selectedMatch.file}:${selectedMatch.line}"`;
    exec(command, (error: Error | null) => {
      if (error) {
        console.error(chalk.red('打开文件时出错：'), error);
        return;
      }
      console.log(chalk.green('已在 Windsurf 中打开文件'));
    });

  } catch (error) {
    console.error(chalk.red('搜索时出错：'), error);
  }
}

async function searchGitProjects(keyword: string): Promise<void> {
  console.log(chalk.yellow('正在搜索远程仓库...'));
  
  try {
    const config = await getConfig();
    
    if (!config['gitlab-token']) {
      console.error(chalk.red('错误: 未设置 GitLab Token'));
      console.log(chalk.yellow('请在 pm_config.json 中设置 gitlab-token'));
      return;
    }

    const axios = require('axios');
    const api = axios.create({
      baseURL: config['gitlab-api-url'],
      headers: {
        'PRIVATE-TOKEN': config['gitlab-token']
      }
    });

    // 调用 GitLab API 搜索项目
    const response = await api.get('/projects', {
      params: {
        search: keyword,
        order_by: 'last_activity_at',
        sort: 'desc'
      }
    });

    const projects: GitRepository[] = response.data;

    if (projects.length === 0) {
      console.log(chalk.yellow('未找到匹配的项目'));
      return;
    }

    // 显示搜索结果
    projects.forEach((project, index) => {
      console.log(chalk.green(`\n${index + 1}. ${project.name}`));
      if (project.description) {
        console.log(chalk.gray(`   描述: ${project.description}`));
      }
      console.log(chalk.blue(`   URL: ${project.web_url}`));
    });

    // 创建选择列表
    const choices = projects.map((project, index) => ({
      name: `${index + 1}. ${project.name} ${project.description ? `- ${project.description}` : ''}`,
      value: project,
      short: project.name
    }));

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: '选择要克隆的项目：',
        choices,
        pageSize: 10
      }
    ]);

    // 确保目标目录存在
    const targetDir = path.join(config['local-project-root-directory'], selected.name);
    
    // 检查目录是否已存在
    try {
      await fs.access(targetDir);
      console.log(chalk.yellow(`\n目录 ${targetDir} 已存在`));
      const { shouldOverwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldOverwrite',
          message: '是否要覆盖已存在的目录？',
          default: false
        }
      ]);

      if (!shouldOverwrite) {
        console.log(chalk.yellow('已取消克隆'));
        return;
      }

      // 如果用户确认覆盖，删除现有目录
      await fs.rm(targetDir, { recursive: true, force: true });
    } catch (error) {
      // 目录不存在，这是正常的，继续执行
    }

    console.log(chalk.green(`\n正在克隆项目 ${selected.name} 到 ${targetDir}...`));
    try {
      const git = simpleGit();
      await git.clone(selected.http_url_to_repo, targetDir);
      console.log(chalk.green('克隆完成！'));
      console.log(chalk.blue(`项目位置: ${targetDir}`));
    } catch (error) {
      console.error(chalk.red('克隆项目时出错：'), error instanceof Error ? error.message : String(error));
    }
  } catch (error: any) {
    if (error?.response?.data) {
      console.error(chalk.red('GitLab API 错误：'), error.response.data.message || error.response.data);
    } else {
      console.error(chalk.red('搜索项目时出错：'), error instanceof Error ? error.message : String(error));
    }
  }
}

interface SearchOptions {
  git?: boolean;
}

export async function searchProjects(keyword: string, options: SearchOptions): Promise<void> {
  if (options.git) {
    await searchGitProjects(keyword);
  } else {
    await searchLocalProjects(keyword);
  }
}
