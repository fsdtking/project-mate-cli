import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getConfigValue } from './config';
import { openWithEditor } from './editor';

interface ProjectInfo {
  name: string;
  path: string;
  type: 'client' | 'server' | 'unknown';
}

// 检测项目类型
async function detectProjectType(projectPath: string): Promise<'client' | 'server' | 'unknown'> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content);
    
    const deps = { 
      ...packageJson.dependencies, 
      ...packageJson.devDependencies 
    };

    // 检测客户端项目的特征
    const clientFeatures = [
      'react', 'vue', 'angular', '@angular/core',
      'next', 'nuxt', 'webpack', 'vite',
      '@vue/cli-service', 'react-scripts'
    ];

    // 检测服务端项目的特征
    const serverFeatures = [
      'express', 'koa', 'fastify', 'nest',
      '@nestjs/core', 'egg', 'midway',
      'mongoose', 'sequelize', 'typeorm',
      'prisma', '@prisma/client'
    ];

    const hasClientDeps = clientFeatures.some(dep => dep in deps);
    const hasServerDeps = serverFeatures.some(dep => dep in deps);

    if (hasClientDeps && !hasServerDeps) return 'client';
    if (hasServerDeps && !hasClientDeps) return 'server';
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

// 搜索项目
export async function searchProjects(keyword: string): Promise<void> {
  const rootDir = await getConfigValue('local-project-root-directory');
  if (!rootDir) {
    console.error(chalk.red('错误：未配置本地项目根目录'));
    return;
  }

  try {
    // 获取根目录下的所有目录
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    const projects: ProjectInfo[] = [];

    // 过滤出目录并检查是否包含 package.json
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(rootDir, entry.name);
        try {
          // 检查是否存在 package.json
          await fs.access(path.join(projectPath, 'package.json'));
          
          // 如果有关键字，检查项目名是否匹配
          if (keyword && !entry.name.toLowerCase().includes(keyword.toLowerCase())) {
            continue;
          }

          // 检测项目类型
          const type = await detectProjectType(projectPath);
          
          projects.push({
            name: entry.name,
            path: projectPath,
            type
          });
        } catch {
          // 如果没有 package.json，跳过这个目录
          continue;
        }
      }
    }

    if (projects.length === 0) {
      console.log(chalk.yellow('未找到匹配的项目'));
      return;
    }

    // 创建选择列表
    const choices = projects.map(project => {
      let prefix = '';
      switch (project.type) {
        case 'client':
          prefix = '🌐 ';
          break;
        case 'server':
          prefix = '🖥️ ';
          break;
        default:
          prefix = '📦 ';
      }
      
      return {
        name: `${prefix}${chalk.green(project.name)} ${chalk.gray(`(${project.type})`)}`,
        value: project,
        short: project.name
      };
    });

    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: '选择要打开的项目：',
        choices,
        pageSize: 10
      }
    ]);

    // 使用配置的编辑器打开项目
    console.log(chalk.blue(`\n正在打开项目：${selectedProject.name}`));
    await openWithEditor(selectedProject.path);

  } catch (error) {
    console.error(chalk.red('搜索项目失败：'), error);
  }
}
