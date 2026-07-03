import * as fs from 'fs';
import * as path from 'path';

export interface ProjectMetadata {
  name: string;
  last_updated: string;
  language_stats: Record<string, number>;
}

export async function parseProject(rootPath: string): Promise<void> {
  console.log(`[Scanner] 开始扫描路径: ${rootPath}`);
  
  // 1. 识别项目元数据
  const metadata: ProjectMetadata = {
    name: path.basename(rootPath),
    last_updated: new Date().toISOString(),
    language_stats: {}
  };

  // 2. 遍历文件并提取结构（MVP 阶段先实现基础的文件发现）
  const files = getAllFiles(rootPath);
  console.log(`[Scanner] 发现 ${files.length} 个文件`);

  // 3. 生成初始图谱 JSON
  const graph = {
    version: "1.0",
    metadata,
    nodes: [],
    edges: []
  };

  const outputPath = path.join(rootPath, 'dongjian-graph.json');
  fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
  console.log(`[Scanner] 图谱已保存至: ${outputPath}`);
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // 跳过 node_modules 和 .git 等目录
      if (!['node_modules', '.git', 'dist'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}
