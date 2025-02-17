import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { setConfig } from './config';

const execAsync = promisify(exec);

// 编辑器配置
interface EditorConfig {
  name: string;
  displayName: string;
  paths: string[];
  command: string;
}

// 主流编辑器列表
const EDITORS: EditorConfig[] = [
  {
    name: 'vscode',
    displayName: 'Visual Studio Code',
    paths: [
      '/Applications/Visual Studio Code.app',
      '/usr/local/bin/code'
    ],
    command: 'code'
  },
  {
    name: 'webstorm',
    displayName: 'WebStorm',
    paths: ['/Applications/WebStorm.app'],
    command: 'webstorm'
  },
  {
    name: 'pycharm',
    displayName: 'PyCharm',
    paths: ['/Applications/PyCharm.app'],
    command: 'pycharm'
  },
  {
    name: 'rustrover',
    displayName: 'RustRover',
    paths: ['/Applications/RustRover.app'],
    command: 'rustrover'
  },
  {
    name: 'idea',
    displayName: 'IntelliJ IDEA',
    paths: ['/Applications/IntelliJ IDEA.app'],
    command: 'idea'
  },
  {
    name: 'goland',
    displayName: 'GoLand',
    paths: ['/Applications/GoLand.app'],
    command: 'goland'
  },
  {
    name: 'windsurf',
    displayName: 'Windsurf',
    paths: ['/Applications/Windsurf.app'],
    command: 'windsurf'
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    paths: ['/Applications/Cursor.app'],
    command: 'cursor'
  },
  {
    name: 'sublime',
    displayName: 'Sublime Text',
    paths: ['/Applications/Sublime Text.app'],
    command: 'subl'
  },
  {
    name: 'atom',
    displayName: 'Atom',
    paths: ['/Applications/Atom.app'],
    command: 'atom'
  }
];

// 检查编辑器是否已安装
async function isEditorInstalled(editor: EditorConfig): Promise<boolean> {
  try {
    // 检查应用程序是否存在
    for (const path of editor.paths) {
      try {
        await fs.access(path);
        return true;
      } catch {
        continue;
      }
    }

    // 检查命令是否可用
    await execAsync(`which ${editor.command}`);
    return true;
  } catch {
    return false;
  }
}

// 获取已安装的编辑器列表
async function getInstalledEditors(): Promise<EditorConfig[]> {
  const installedEditors: EditorConfig[] = [];
  
  for (const editor of EDITORS) {
    if (await isEditorInstalled(editor)) {
      installedEditors.push(editor);
    }
  }
  
  return installedEditors;
}

// 选择编辑器
export async function selectEditor(): Promise<void> {
  try {
    const installedEditors = await getInstalledEditors();
    
    if (installedEditors.length === 0) {
      console.error(chalk.red('错误：未找到已安装的编辑器'));
      return;
    }

    const { selectedEditor } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedEditor',
        message: '选择默认编辑器：',
        choices: installedEditors.map(editor => ({
          name: `${editor.displayName} (${editor.command})`,
          value: editor.name
        })),
        pageSize: 10
      }
    ]);

    await setConfig('editor', selectedEditor);
    console.log(chalk.green(`已将 ${selectedEditor} 设置为默认编辑器`));
  } catch (error) {
    console.error(chalk.red('设置编辑器失败：'), error);
  }
}

// 使用配置的编辑器打开项目
export async function openWithEditor(projectPath: string): Promise<void> {
  try {
    // 首先尝试使用 VSCode
    if (await isEditorInstalled(EDITORS[0])) {
      exec(`code "${projectPath}"`);
      return;
    }
    
    // 如果没有 VSCode，尝试使用 IDEA
    if (await isEditorInstalled(EDITORS[4])) {
      exec(`idea "${projectPath}"`);
      return;
    }
    
    // 如果都没有，抛出错误
    throw new Error('未找到可用的编辑器');
  } catch (error) {
    console.error(chalk.red('打开项目失败：'), error);
  }
}
