import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { exec } from 'child_process';
import inquirer from 'inquirer';
import { PackageJson, ProjectType } from '../types';

// 检测项目类型
export async function detectProjectType(packageJson: PackageJson): Promise<ProjectType> {
  // 如果已经在 package.json 中指定了项目类型，直接返回
  if (packageJson.projectType) {
    return packageJson.projectType;
  }

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
  if (hasClientDeps && hasServerDeps) {
    // 如果同时包含客户端和服务端特征，通过其他特征进一步判断
    const isMonorepo = packageJson.scripts?.['build:client'] || packageJson.scripts?.['build:server'];
    if (isMonorepo) {
      // 根据当前执行目录判断
      const currentDir = path.basename(process.cwd());
      if (currentDir.includes('client') || currentDir.includes('frontend')) return 'client';
      if (currentDir.includes('server') || currentDir.includes('backend')) return 'server';
    }
  }

  return 'unknown';
}

// 获取当前项目的 package.json
export async function getProjectPackageJson(cwd: string = process.cwd()): Promise<PackageJson | null> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    return JSON.parse(packageJsonContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(chalk.red('错误：当前目录下未找到 package.json 文件'));
    } else {
      console.error(chalk.red('读取 package.json 失败：'), error);
    }
    return null;
  }
}

// 执行选中的脚本
export async function executeScript(scriptName: string, scriptCommand: string, cwd: string = process.cwd()): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`\n执行命令: ${scriptCommand}`));
    const child = exec(`npm run ${scriptName}`, { cwd });

    // 实时输出命令执行结果
    child.stdout?.on('data', (data) => {
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('error', (error) => {
      console.error(chalk.red('\n命令执行失败：'), error);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n命令执行完成'));
        resolve();
      } else {
        console.error(chalk.red(`\n命令执行失败，退出码：${code}`));
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

// 显示并运行脚本
export async function listAndRunScript(cwd: string = process.cwd()): Promise<void> {
  const packageJson = await getProjectPackageJson(cwd);
  if (!packageJson) return;

  const scripts = packageJson.scripts || {};
  if (Object.keys(scripts).length === 0) {
    console.log(chalk.yellow('当前项目没有可用的脚本命令'));
    return;
  }

  // 检测项目类型
  const projectType = await detectProjectType(packageJson);
  console.log(chalk.blue(`\n项目类型: ${projectType}`));

  // 准备选项列表，根据项目类型添加提示
  const choices = Object.entries(scripts).map(([name, command]) => {
    let prefix = '';
    // 为不同类型的项目添加特定的命令提示
    if (projectType === 'client') {
      if (name.includes('build')) prefix = '📦 ';
      if (name.includes('dev') || name.includes('serve')) prefix = '🚀 ';
      if (name.includes('test')) prefix = '🧪 ';
    } else if (projectType === 'server') {
      if (name.includes('start')) prefix = '🚀 ';
      if (name.includes('migrate')) prefix = '🔄 ';
      if (name.includes('seed')) prefix = '🌱 ';
    }

    return {
      name: `${prefix}${chalk.green(name.padEnd(15))} ${chalk.gray(command)}`,
      value: { name, command },
      short: name
    };
  });

  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: '选择要执行的命令：',
      choices,
      pageSize: 10
    }
  ]);

  try {
    await executeScript(selected.name, selected.command);
  } catch (error) {
    // 错误已在 executeScript 中处理
  }
}
