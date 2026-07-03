import * as fs from 'fs';
import * as path from 'path';
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import { extractImports } from './import-extractor';

export interface GraphNode {
  id: string;
  type: 'file' | 'class' | 'function' | 'variable';
  label: string;
  parent_id?: string;
  summary?: string;
  architecture_layer?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'contains' | 'calls' | 'imports';
  weight?: number;
}

export interface ProjectMetadata {
  name: string;
  last_updated: string;
  language_stats: Record<string, number>;
}

export interface KnowledgeGraph {
  version: string;
  metadata: ProjectMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// 辅助函数：通过类型查找子节点
function findChildByType(node: any, type: string): any {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === type) {
      return child;
    }
  }
  return null;
}

// 辅助函数：获取节点的文本内容
function getNodeText(node: any): string {
  return node.text || '';
}

// 检测函数调用关系
function detectCalls(funcNode: any, sourceFuncId: string, edges: GraphEdge[]) {
  const bodyNode = findChildByType(funcNode, 'statement_block') || 
                   findChildByType(funcNode, 'method_body');
  
  if (!bodyNode) return;

  // 遍历函数体，寻找 call_expression 节点
  function traverseForCalls(node: any) {
    if (node.type === 'call_expression') {
      const funcPart = findChildByType(node, 'member_expression') || 
                       findChildByType(node, 'identifier');
      if (funcPart) {
        const calledName = getNodeText(funcPart);
        // 这里简化处理，只记录调用名称，实际应该解析出完整的目标函数 ID
        edges.push({
          source: sourceFuncId,
          target: `func:${calledName}`, // 简化目标 ID
          type: 'calls'
        });
      }
    }
    
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        traverseForCalls(child);
      }
    }
  }

  traverseForCalls(bodyNode);
}

export async function parseProject(rootPath: string): Promise<void> {
  console.log(`[Scanner] 开始扫描路径: ${rootPath}`);
  
  const parser = new Parser();
  parser.setLanguage(TypeScript.typescript);

  const metadata: ProjectMetadata = {
    name: path.basename(rootPath),
    last_updated: new Date().toISOString(),
    language_stats: {}
  };

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const files = getAllFiles(rootPath);

  console.log(`[Scanner] 发现 ${files.length} 个文件，正在解析...`);

  for (const filePath of files) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const tree = parser.parse(content);
      const relativePath = path.relative(rootPath, filePath);

      // 1. 添加文件节点
      const fileNodeId = `file:${relativePath}`;
      nodes.push({
        id: fileNodeId,
        type: 'file',
        label: path.basename(filePath),
        summary: `Source file: ${relativePath}`
      });

      // 2. 提取 import 依赖
      const imports = extractImports(content, filePath);
      for (const imp of imports) {
        if (imp.target) {
          const targetRelative = path.relative(rootPath, imp.target);
          edges.push({
            source: fileNodeId,
            target: `file:${targetRelative}`,
            type: 'imports'
          });
        }
      }

      // 3. 提取函数和类
      extractDeclarations(tree.rootNode, fileNodeId, nodes, edges);

    } catch (error) {
      console.warn(`[Scanner] 解析失败: ${filePath}`, error);
    }
  }

  const graph: KnowledgeGraph = {
    version: "1.0",
    metadata,
    nodes,
    edges
  };

  const outputPath = path.join(rootPath, 'dongjian-graph.json');
  fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
  console.log(`[Scanner] 图谱已保存至: ${outputPath} (包含 ${nodes.length} 个节点, ${edges.length} 条边)`);
}

function extractDeclarations(node: any, parentId: string, nodes: GraphNode[], edges: GraphEdge[]) {
  // 处理类声明
  if (node.type === 'class_declaration') {
    const nameNode = findChildByType(node, 'type_identifier');
    if (nameNode) {
      const className = getNodeText(nameNode);
      const classId = `${parentId}:${className}`;
      nodes.push({
        id: classId,
        type: 'class',
        label: className,
        parent_id: parentId
      });
      edges.push({
        source: parentId,
        target: classId,
        type: 'contains'
      });

      // 递归处理类体中的成员
      const classBody = findChildByType(node, 'class_body');
      if (classBody) {
        for (let i = 0; i < classBody.childCount; i++) {
          const child = classBody.child(i);
          if (child) {
            extractDeclarations(child, classId, nodes, edges);
          }
        }
      }
      return;
    }
  }

  // 处理接口声明
  if (node.type === 'interface_declaration') {
    const nameNode = findChildByType(node, 'type_identifier');
    if (nameNode) {
      const interfaceName = getNodeText(nameNode);
      const interfaceId = `${parentId}:${interfaceName}`;
      nodes.push({
        id: interfaceId,
        type: 'variable', // 暂时归类为 variable，后续可以细化
        label: interfaceName,
        parent_id: parentId
      });
      edges.push({
        source: parentId,
        target: interfaceId,
        type: 'contains'
      });
      return;
    }
  }

  // 处理函数/方法声明
  if (node.type === 'method_definition' || node.type === 'function_declaration') {
    const nameNode = findChildByType(node, 'property_identifier') || findChildByType(node, 'identifier');
    if (nameNode) {
      const funcName = getNodeText(nameNode);
      const funcId = `${parentId}:${funcName}`;
      nodes.push({
        id: funcId,
        type: 'function',
        label: funcName,
        parent_id: parentId
      });
      edges.push({
        source: parentId,
        target: funcId,
        type: 'contains'
      });

      // 检测函数体内的调用关系
      detectCalls(node, funcId, edges);
    }
  }

  // 递归遍历所有子节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      extractDeclarations(child, parentId, nodes, edges);
    }
  }
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
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
