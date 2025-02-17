import fs from 'fs/promises';
import path from 'path';
import { Config } from '../types';

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, '../../pm_config.json');

// 默认配置
const DEFAULT_CONFIG: Config = {
  'git-remote-address': 'https://github.com/',
  'local-project-root-directory': process.cwd(),
  'gitlab-token': '',
  'gitlab-api-url': 'https://gitlab.com/api/v4'
};

// 确保配置文件存在
export async function ensureConfig(): Promise<void> {
  try {
    await fs.access(CONFIG_PATH);
  } catch {
    // 配置文件不存在，创建默认配置
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

// 获取配置
export async function getConfig(): Promise<Config> {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error('读取配置文件失败：', error);
    return DEFAULT_CONFIG;
  }
}

// 设置配置项
export async function setConfig(key: keyof Config, value: string): Promise<void> {
  try {
    const config = await getConfig();
    config[key] = value;
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    throw error;
  }
}

// 获取配置项的值
export async function getConfigValue(key: keyof Config): Promise<string> {
  try {
    const config = await getConfig();
    return config[key];
  } catch (error) {
    console.error('获取配置项失败：', error);
    return DEFAULT_CONFIG[key];
  }
}

// 获取所有配置项的键
export async function getConfigKeys(): Promise<Array<keyof Config>> {
  return Object.keys(DEFAULT_CONFIG) as Array<keyof Config>;
}
