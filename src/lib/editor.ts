import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { setConfig, getConfig } from './config';

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
    paths: [
      '/Applications/WebStorm.app',
      '/Applications/JetBrains Toolbox/WebStorm.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/WebStorm/ch-0/*/*.app',
      '/Users/*/Applications/WebStorm*.app'
    ],
    command: 'webstorm'
  },
  {
    name: 'pycharm',
    displayName: 'PyCharm',
    paths: [
      '/Applications/PyCharm.app',
      '/Applications/JetBrains Toolbox/PyCharm.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/PyCharm-P/ch-0/*/*.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/PyCharm-C/ch-0/*/*.app',
      '/Users/*/Applications/PyCharm*.app'
    ],
    command: 'pycharm'
  },
  {
    name: 'rustrover',
    displayName: 'RustRover',
    paths: [
      '/Applications/RustRover.app',
      '/Applications/JetBrains Toolbox/RustRover.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/RustRover/ch-0/*/*.app',
      '/Users/*/Applications/RustRover*.app'
    ],
    command: 'rustrover'
  },
  {
    name: 'idea',
    displayName: 'IntelliJ IDEA',
    paths: [
      '/Applications/IntelliJ IDEA.app',
      '/Applications/JetBrains Toolbox/IntelliJ IDEA.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/IDEA-U/ch-0/*/*.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/IDEA-C/ch-0/*/*.app',
      '/Users/*/Applications/IntelliJ IDEA*.app'
    ],
    command: 'idea'
  },
  {
    name: 'goland',
    displayName: 'GoLand',
    paths: [
      '/Applications/GoLand.app',
      '/Applications/JetBrains Toolbox/GoLand.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/GoLand/ch-0/*/*.app',
      '/Users/*/Applications/GoLand*.app'
    ],
    command: 'goland'
  },
  {
    name: 'clion',
    displayName: 'CLion',
    paths: [
      '/Applications/CLion.app',
      '/Applications/JetBrains Toolbox/CLion.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/CLion/ch-0/*/*.app',
      '/Users/*/Applications/CLion*.app'
    ],
    command: 'clion'
  },
  {
    name: 'phpstorm',
    displayName: 'PhpStorm',
    paths: [
      '/Applications/PhpStorm.app',
      '/Applications/JetBrains Toolbox/PhpStorm.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/PhpStorm/ch-0/*/*.app',
      '/Users/*/Applications/PhpStorm*.app'
    ],
    command: 'phpstorm'
  },
  {
    name: 'datagrip',
    displayName: 'DataGrip',
    paths: [
      '/Applications/DataGrip.app',
      '/Applications/JetBrains Toolbox/DataGrip.app',
      '/Users/*/Applications/JetBrains Toolbox/apps/DataGrip/ch-0/*/*.app',
      '/Users/*/Applications/DataGrip*.app'
    ],
    command: 'datagrip'
  },
  {
    name: 'windsurf',
    displayName: 'Windsurf',
    paths: [
      '/Applications/Windsurf.app',
      '/Users/*/Applications/Windsurf.app'
    ],
    command: 'windsurf'
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    paths: [
      '/Applications/Cursor.app',
      '/Users/*/Applications/Cursor.app'
    ],
    command: 'cursor'
  },
  {
    name: 'sublime',
    displayName: 'Sublime Text',
    paths: [
      '/Applications/Sublime Text.app',
      '/usr/local/bin/subl'
    ],
    command: 'subl'
  },
  {
    name: 'atom',
    displayName: 'Atom',
    paths: [
      '/Applications/Atom.app',
      '/usr/local/bin/atom'
    ],
    command: 'atom'
  },
  {
    name: 'nova',
    displayName: 'Nova',
    paths: [
      '/Applications/Nova.app',
      '/usr/local/bin/nova'
    ],
    command: 'nova'
  }
];

// 检查编辑器是否已安装
async function isEditorInstalled(editor: EditorConfig): Promise<boolean> {
  try {
    // 检查应用程序是否存在
    for (const pathPattern of editor.paths) {
      try {
        if (pathPattern.includes('*')) {
          // 如果路径包含通配符，使用 glob 模式匹配
          const { glob } = await import('glob');
          const matches = await glob(pathPattern);
          if (matches.length > 0) {
            return true;
          }
        } else {
          // 直接检查具体路径
          await fs.access(pathPattern);
          return true;
        }
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
    // 获取配置的编辑器
    const config = await getConfig();
    const configEditor = config.editor;
    const editor = EDITORS.find(e => e.name === configEditor);
    
    if (!editor) {
      throw new Error(`未找到编辑器配置：${configEditor}`);
    }

    // 检查编辑器是否已安装
    if (await isEditorInstalled(editor)) {
      exec(`${editor.command} "${projectPath}"`);
      return;
    }
    
    // 如果配置的编辑器不可用，尝试使用 VSCode
    if (configEditor !== 'vscode' && await isEditorInstalled(EDITORS[0])) {
      exec(`code "${projectPath}"`);
      return;
    }
    
    // 如果 VSCode 也不可用，尝试使用 IDEA
    if (configEditor !== 'idea' && await isEditorInstalled(EDITORS[4])) {
      exec(`idea "${projectPath}"`);
      return;
    }
    
    throw new Error('未找到可用的编辑器');
  } catch (error) {
    console.error(chalk.red('打开项目失败：'), error);
    throw error;
  }
}
