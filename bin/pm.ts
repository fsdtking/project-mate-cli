#!/usr/bin/env node

import { program } from 'commander';
import { searchProjects } from '../lib/search';

program
  .version('1.0.0')
  .description('项目管理工具');

program
  .command('search <keyword>')
  .option('-g, --git', '在远程Git仓库中搜索')
  .description('搜索项目')
  .action(async (keyword: string, options: { git?: boolean }) => {
    await searchProjects(keyword, options);
  });

program.parse(process.argv);