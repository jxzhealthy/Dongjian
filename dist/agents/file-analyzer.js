"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFile = analyzeFile;
/**
 * 文件分析器 Agent
 * 负责调用 LLM 生成代码摘要和识别架构层级
 */
const openai_1 = __importDefault(require("openai"));
const client = process.env.DASHSCOPE_API_KEY
    ? new openai_1.default({
        apiKey: process.env.DASHSCOPE_API_KEY,
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    })
    : null;
/**
 * 调用 Qwen3.7-max 进行代码语义分析
 */
async function analyzeFile(content, filePath) {
    if (!process.env.DASHSCOPE_API_KEY) {
        console.warn('[Agent] 未检测到 DASHSCOPE_API_KEY，使用启发式占位符。');
        return getHeuristicAnalysis(filePath);
    }
    console.log(`[Agent] 正在通过 Qwen3.7-max 分析: ${filePath}`);
    const prompt = `
请分析以下 TypeScript 代码文件：${filePath}

代码内容：
\`\`\`typescript
${content.substring(0, 4000)} 
\`\`\`

请以 JSON 格式返回以下信息（不要包含 markdown 代码块标记）：
{
  "summary": "用一句话精炼总结该文件的核心职责和业务逻辑",
  "architecture_layer": "判断该文件属于哪一层: api(接口层), service(业务逻辑层), data(数据层), util(工具层), core(核心引擎层)",
  "key_concepts": ["列出3-5个该文件中出现的关键技术点或业务概念"]
}
`;
    try {
        if (!client)
            throw new Error('Client not initialized');
        const completion = await client.chat.completions.create({
            model: "qwen3.7-max",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.0,
            max_tokens: 1024,
        });
        const resultStr = completion.choices[0].message.content || '{}';
        const result = JSON.parse(resultStr);
        return {
            summary: result.summary || '分析失败',
            architecture_layer: result.architecture_layer || 'unknown',
            key_concepts: result.key_concepts || []
        };
    }
    catch (error) {
        console.error('[Agent] LLM 调用失败:', error);
        return getHeuristicAnalysis(filePath);
    }
}
function getHeuristicAnalysis(filePath) {
    let layer = 'unknown';
    if (filePath.includes('/parser/'))
        layer = 'core';
    else if (filePath.includes('/api/'))
        layer = 'api';
    else if (filePath.includes('/service/'))
        layer = 'service';
    else if (filePath.includes('/model/'))
        layer = 'data';
    else if (filePath.includes('/utils/'))
        layer = 'util';
    return {
        summary: `Source file located at ${filePath}.`,
        architecture_layer: layer,
        key_concepts: ['code-structure']
    };
}
