import * as fs from 'fs';
import * as path from 'path';

export interface ImportInfo {
  source: string; // 导入的文件路径
  imported: string[]; // 导入的符号列表
  target?: string; // 目标文件路径（如果可解析）
}

/**
 * 从源代码中提取 import 语句
 */
export function extractImports(content: string, filePath: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  // 匹配 ES6 import 语句
  // import { A, B } from './module'
  // import A from './module'
  // import * as A from './module'
  const importRegex = /import\s+(?:(?:\{([^}]*)\})|(?:\*\s+as\s+(\w+))|(?:([\w]+)))\s+from\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const namedImports = match[1]; // { A, B }
    const defaultImport = match[2] || match[3]; // A or * as A
    const source = match[4]; // './module'
    
    const imported: string[] = [];
    if (namedImports) {
      imported.push(...namedImports.split(',').map(s => s.trim()).filter(Boolean));
    }
    if (defaultImport) {
      imported.push(defaultImport);
    }
    
    // 尝试解析相对路径
    let targetPath: string | undefined;
    if (source.startsWith('.')) {
      const dir = path.dirname(filePath);
      const resolved = path.resolve(dir, source);
      // 尝试添加 .ts/.tsx/.js 扩展名
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
        const candidate = resolved + ext;
        if (fs.existsSync(candidate)) {
          targetPath = candidate;
          break;
        }
      }
    }
    
    imports.push({
      source: filePath,
      imported,
      target: targetPath
    });
  }
  
  return imports;
}
