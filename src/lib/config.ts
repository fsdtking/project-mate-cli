import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { Config } from '../types';

const CONFIG_PATH = path.join(__dirname, '../../pm_config.json');

export async function getConfig(): Promise<Config> {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(chalk.red('读取配置文件失败：'), error);
    return {
      'git-remote-address': 'https://github.com/',
      'local-project-root-directory': process.cwd(),
      'gitlab-token': '',
      'gitlab-api-url': ''
    };
  }
}

export async function setConfig(key: keyof Config, value: string): Promise<void> {
  try {
    const config = await getConfig();
    config[key] = value;
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log(chalk.green(`配置项 ${key} 已更新`));
  } catch (error) {
    console.error(chalk.red('更新配置失败：'), error);
    throw error;
  }
}

export async function getConfigValue(key: keyof Config): Promise<string> {
  try {
    const config = await getConfig();
    return config[key];
  } catch (error) {
    console.error(chalk.red('读取配置失败：'), error);
    throw error;
  }
}

// 获取所有可配置的键
export function getConfigKeys(): Array<keyof Config> {
  return [
    'git-remote-address',
    'local-project-root-directory',
    'gitlab-token',
    'gitlab-api-url'
  ];
}
