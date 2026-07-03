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
exports.extractImports = extractImports;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 从源代码中提取 import 语句
 */
function extractImports(content, filePath) {
    const imports = [];
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
        const imported = [];
        if (namedImports) {
            imported.push(...namedImports.split(',').map(s => s.trim()).filter(Boolean));
        }
        if (defaultImport) {
            imported.push(defaultImport);
        }
        // 尝试解析相对路径
        let targetPath;
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
