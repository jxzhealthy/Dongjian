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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProject = parseProject;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function parseProject(rootPath) {
    console.log(`[Scanner] 开始扫描路径: ${rootPath}`);
    // 1. 识别项目元数据
    const metadata = {
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
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            // 跳过 node_modules 和 .git 等目录
            if (!['node_modules', '.git', 'dist'].includes(file)) {
                arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
            }
        }
        else {
            arrayOfFiles.push(filePath);
        }
    });
    return arrayOfFiles;
}
