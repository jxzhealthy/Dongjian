"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProject = parseProject;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const tree_sitter_1 = __importDefault(require("tree-sitter"));
// @ts-ignore
const tree_sitter_typescript_1 = __importDefault(require("tree-sitter-typescript"));
// @ts-ignore
const tree_sitter_java_1 = __importDefault(require("tree-sitter-java"));
const import_extractor_1 = require("./import-extractor");
const file_analyzer_1 = require("../agents/file-analyzer");
const LANGUAGES = {
    typescript: { parser: tree_sitter_typescript_1.default.typescript, extensions: ['.ts', '.tsx'] },
    javascript: { parser: tree_sitter_typescript_1.default.javascript, extensions: ['.js', '.jsx'] },
    // @ts-ignore
    java: { parser: tree_sitter_java_1.default, extensions: ['.java'] }, // Java package might export WASM or different structure
};
function getLanguage(filePath) {
    for (const lang of Object.values(LANGUAGES)) {
        if (lang.extensions.some(ext => filePath.endsWith(ext))) {
            return lang;
        }
    }
    return null;
}
// 辅助函数：通过类型查找子节点
function findChildByType(node, type) {
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === type) {
            return child;
        }
    }
    return null;
}
// 辅助函数：获取节点的文本内容
function getNodeText(node) {
    return node.text || '';
}
// 检测函数调用关系
function detectCalls(funcNode, sourceFuncId, edges) {
    const bodyNode = findChildByType(funcNode, 'statement_block') ||
        findChildByType(funcNode, 'method_body') ||
        findChildByType(funcNode, 'block');
    if (!bodyNode)
        return;
    // 遍历函数体，寻找 call_expression (TS/JS) 或 method_invocation (Java) 节点
    function traverseForCalls(node) {
        let calledName = '';
        if (node.type === 'call_expression' || node.type === 'method_invocation') {
            const funcPart = findChildByType(node, 'member_expression') ||
                findChildByType(node, 'identifier') ||
                findChildByType(node, 'method_name'); // Java uses method_name
            if (funcPart) {
                calledName = getNodeText(funcPart);
            }
        }
        else if (node.type === 'call') { // Python uses 'call'
            const funcPart = findChildByType(node, 'attribute') || findChildByType(node, 'identifier');
            if (funcPart) {
                calledName = getNodeText(funcPart);
            }
        }
        if (calledName) {
            edges.push({
                source: sourceFuncId,
                target: `func:${calledName}`,
                type: 'calls'
            });
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
async function parseProject(rootPath, outputFile = 'dongjian-graph.json', excludePatterns = ['node_modules', 'dist', '.git']) {
    console.log(`[Scanner] 开始扫描路径: ${rootPath}`);
    const metadata = {
        name: path.basename(rootPath),
        last_updated: new Date().toISOString(),
        language_stats: {}
    };
    const nodes = [];
    const edges = [];
    const files = getAllFiles(rootPath, [], excludePatterns);
    console.log(`[Scanner] 发现 ${files.length} 个文件，正在解析...`);
    for (const filePath of files) {
        const langConfig = getLanguage(filePath);
        if (!langConfig)
            continue;
        try {
            const parser = new tree_sitter_1.default();
            parser.setLanguage(langConfig.parser);
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
            const imports = (0, import_extractor_1.extractImports)(content, filePath);
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
            // 4. AI 语义分析（生成摘要与架构分层）
            const analysis = await (0, file_analyzer_1.analyzeFile)(content, relativePath);
            const fileNode = nodes.find(n => n.id === fileNodeId);
            if (fileNode) {
                fileNode.summary = analysis.summary;
                fileNode.architecture_layer = analysis.architecture_layer;
            }
        }
        catch (error) {
            console.warn(`[Scanner] 解析失败: ${filePath}`, error);
        }
    }
    const graph = {
        version: "1.0",
        metadata,
        nodes,
        edges
    };
    // 过滤掉指向不存在节点的边
    const nodeIds = new Set(nodes.map(n => n.id));
    const validEdges = edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));
    const outputPath = path.join(rootPath, outputFile);
    fs.writeFileSync(outputPath, JSON.stringify({ ...graph, edges: validEdges }, null, 2));
    console.log(`[Scanner] 图谱已保存至: ${outputPath} (包含 ${nodes.length} 个节点, ${validEdges.length} 条有效边)`);
}
function extractDeclarations(node, parentId, nodes, edges) {
    // 处理类声明 (TS/JS/Java)
    if (node.type === 'class_declaration' || node.type === 'class_definition') {
        const nameNode = findChildByType(node, 'type_identifier') ||
            findChildByType(node, 'identifier');
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
            const classBody = findChildByType(node, 'class_body') || findChildByType(node, 'block');
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
    // 处理接口声明 (TS/Java)
    if (node.type === 'interface_declaration') {
        const nameNode = findChildByType(node, 'type_identifier');
        if (nameNode) {
            const interfaceName = getNodeText(nameNode);
            const interfaceId = `${parentId}:${interfaceName}`;
            nodes.push({
                id: interfaceId,
                type: 'variable',
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
    if (node.type === 'method_definition' || node.type === 'function_declaration' || node.type === 'method_declaration' || node.type === 'function_definition') {
        const nameNode = findChildByType(node, 'property_identifier') ||
            findChildByType(node, 'identifier');
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
function getAllFiles(dirPath, arrayOfFiles = [], excludePatterns = ['node_modules', 'dist', '.git']) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        if (excludePatterns.includes(file))
            return;
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles, excludePatterns);
        }
        else {
            arrayOfFiles.push(filePath);
        }
    });
    return arrayOfFiles;
}
