import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { spawn } from 'child_process';
import inquirer from 'inquirer';
import { PackageJson, ProjectType } from '../types';

// 检测项目类型
async function detectProjectType(): Promise<ProjectType> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson: PackageJson = JSON.parse(content);
    
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

// 获取脚本图标
function getScriptIcon(scriptName: string, projectType: ProjectType): string {
  const lowercaseName = scriptName.toLowerCase();
  
  if (projectType === 'client') {
    if (lowercaseName.includes('dev') || lowercaseName.includes('serve')) {
      return '🚀';
    }
    if (lowercaseName.includes('build')) {
      return '📦';
    }
    if (lowercaseName.includes('test')) {
      return '🧪';
    }
  } else if (projectType === 'server') {
    if (lowercaseName.includes('start')) {
      return '🚀';
    }
    if (lowercaseName.includes('migrate')) {
      return '🔄';
    }
    if (lowercaseName.includes('seed')) {
      return '🌱';
    }
  }
  
  return '▶️';
}

// 列出并运行脚本
export async function listAndRunScript(): Promise<void> {
  try {
    // 读取 package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson: PackageJson = JSON.parse(content);

    if (!packageJson.scripts || Object.keys(packageJson.scripts).length === 0) {
      console.log(chalk.yellow('当前项目没有可用的脚本'));
      return;
    }

    // 检测项目类型
    const projectType = await detectProjectType();

    // 创建选择列表
    const choices = Object.entries(packageJson.scripts).map(([name, command]) => ({
      name: `${getScriptIcon(name, projectType)} ${chalk.green(name)}: ${chalk.gray(command)}`,
      value: name,
      short: name
    }));

    const { selectedScript } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedScript',
        message: '选择要运行的脚本：',
        choices,
        pageSize: 10
      }
    ]);

    console.log(chalk.blue(`\n正在运行：npm run ${selectedScript}`));

    // 运行选中的脚本
    const child = spawn('npm', ['run', selectedScript], {
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (error) => {
      console.error(chalk.red('运行脚本失败：'), error);
    });

  } catch (error) {
    console.error(chalk.red('读取脚本失败：'), error);
  }
}
