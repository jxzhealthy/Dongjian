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
exports.calculateHash = calculateHash;
exports.detectChanges = detectChanges;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
/**
 * 计算文件内容的 SHA-256 哈希值
 */
function calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}
/**
 * 检测项目中的文件变动
 */
function detectChanges(rootPath, previousHashes) {
    const changes = [];
    const currentFiles = getAllFiles(rootPath);
    const currentHashes = {};
    // 1. 检查新增和修改的文件
    for (const filePath of currentFiles) {
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.js'))
            continue;
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const hash = calculateHash(content);
            currentHashes[filePath] = hash;
            if (!previousHashes[filePath]) {
                changes.push({ path: filePath, status: 'added', newHash: hash });
            }
            else if (previousHashes[filePath] !== hash) {
                changes.push({ path: filePath, status: 'modified', oldHash: previousHashes[filePath], newHash: hash });
            }
        }
        catch (error) {
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
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const filePath = require('path').join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
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
