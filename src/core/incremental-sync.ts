import * as crypto from 'crypto';
import * as fs from 'fs';

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  oldHash?: string;
  newHash?: string;
}

/**
 * 计算文件内容的 SHA-256 哈希值
 */
export function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 检测项目中的文件变动
 */
export function detectChanges(rootPath: string, previousHashes: Record<string, string>): FileChange[] {
  const changes: FileChange[] = [];
  const currentFiles = getAllFiles(rootPath);
  const currentHashes: Record<string, string> = {};

  // 1. 检查新增和修改的文件
  for (const filePath of currentFiles) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) continue;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = calculateHash(content);
      currentHashes[filePath] = hash;

      if (!previousHashes[filePath]) {
        changes.push({ path: filePath, status: 'added', newHash: hash });
      } else if (previousHashes[filePath] !== hash) {
        changes.push({ path: filePath, status: 'modified', oldHash: previousHashes[filePath], newHash: hash });
      }
    } catch (error) {
      console.warn(`[Incremental] 读取文件失败: ${filePath}`);
    }
  }

  // 2. 检查删除的文件
  for (const path in previousHashes) {
    if (!currentHashes[path]) {
      changes.push({ path, status: 'deleted', oldHash: previousHashes[path] });
    }
  }

  return changes;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = require('path').join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', '.git', 'dist'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  return arrayOfFiles;
}
