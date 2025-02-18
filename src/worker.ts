import { parentPort, workerData } from 'worker_threads';
import { searchFile } from './lib/search';
import { SearchMatch } from './types';

async function workerProcess(files: string[], keyword: string): Promise<void> {
  const results: SearchMatch[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      parentPort?.postMessage({ currentFile: file });
      const matches = await searchFile(file, keyword);
      matches.forEach(match => parentPort?.postMessage({ match }));
      results.push(...matches);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`处理文件 ${file} 时出错: ${errorMessage}`);
      parentPort?.postMessage({ error: `处理文件 ${file} 时出错: ${errorMessage}` });
    }
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }

  parentPort?.postMessage({ done: true, results });
}

if (parentPort) {
  const { files, keyword } = workerData;
  workerProcess(files, keyword).catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
  });
}
