import fs from 'fs/promises';
import path from 'path';
import { Config } from '../types';
import chalk from 'chalk';
import { selectEditor } from './editor';

// 配置文件路径
const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '', '.pm-cli');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// 确保配置目录存在
async function ensureConfigDir() {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

// 默认配置
const DEFAULT_CONFIG: Config = {
  'git-remote-address': 'https://github.com/',
  'local-project-root-directory': process.cwd(),
  'gitlab-token': '',
  'gitlab-api-url': 'https://gitlab.com/api/v4',
  'editor': 'vscode'
};

// 确保配置文件存在
export async function ensureConfig(): Promise<void> {
  try {
    // 首先确保配置目录存在
    await ensureConfigDir();
    
    try {
      await fs.access(CONFIG_PATH);
    } catch {
      // 配置文件不存在，创建默认配置
      await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    }
  } catch (error) {
    console.error(chalk.red('初始化配置文件失败：'), error);
    throw error;
  }
}

// 获取配置
export async function getConfig(): Promise<Config> {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error(chalk.red('读取配置文件失败：'), error);
    return DEFAULT_CONFIG;
  }
}

// 设置配置项
export async function setConfig(key: keyof Config, value: string): Promise<void> {
  try {
    if (key === 'editor' && !value) {
      // 如果是设置编辑器且没有提供值，则进入交互式选择
      await selectEditor();
      return;
    }

    const config = await getConfig();
    config[key] = value;
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(chalk.green(`配置项 ${key} 已更新为 ${value}`));
  } catch (error) {
    console.error(chalk.red('更新配置失败：'), error);
    throw error;
  }
}

// 获取配置项的值
export async function getConfigValue(key: keyof Config): Promise<string> {
  try {
    const config = await getConfig();
    return config[key];
  } catch (error) {
    console.error(chalk.red('获取配置项失败：'), error);
    return DEFAULT_CONFIG[key];
  }
}

// 获取所有配置项的键
export async function getConfigKeys(): Promise<Array<keyof Config>> {
  return Object.keys(DEFAULT_CONFIG) as Array<keyof Config>;
}
