# Dongjian (洞见) - 代码知识图谱生成器

**Dongjian** 是一款基于 Tree-sitter 和 LLM 的开发者工具，能够将复杂的代码库转化为可交互的知识图谱。它帮助开发者快速理解项目结构、梳理依赖关系并识别架构层级。

## ✨ 核心特性

- **多语言支持**：原生支持 TypeScript、JavaScript 和 Java，精准提取类、函数、接口及调用关系。
- **AI 语义增强**：集成 Qwen3.7-max，自动生成代码摘要并智能识别架构分层（API/Service/Core 等）。
- **增量同步**：基于文件哈希检测变更，仅重新分析受影响的模块，大幅降低计算开销。
- **交互式可视化**：内置 Web Dashboard，支持节点搜索、详情查看及动态布局渲染。
- **本地化部署**：纯 Node.js 实现，无需云端依赖，保障代码隐私安全。

## 🚀 快速开始

### 1. 全局安装 (推荐)
你可以直接从 npm 安装并使用全局命令：
```bash
npm install -g dongjian
```

### 2. 源码安装
如果你希望参与贡献或使用最新开发版：
```bash
git clone https://github.com/your-username/DongJian.git
cd DongJian
npm install && npm run build
npm link # 注册全局命令
```

### 3. 配置 API Key (可选但推荐)
为了获得高质量的代码摘要，请设置环境变量：
```bash
export DASHSCOPE_API_KEY="sk-your-api-key-here"
```
*注：如果没有配置 Key，工具将自动降级到启发式模式，仅提取基础结构。*

## 🛠️ 使用指南

### 扫描代码库
使用 `scan` 命令分析你的项目：
```bash
# 扫描当前目录
dongjian scan .

# 自定义输出文件名并排除特定文件夹
dongjian scan ./my-app --exclude node_modules test -o result.json
```

### 查看帮助
```bash
dongjian --help       # 查看主命令帮助
dongjian scan --help  # 查看扫描命令的详细参数
```

### 查看示例数据
项目自带了 Dongjian 自身的分析结果作为示例，位于 `examples/dongjian-self-analysis.json`。你可以将其复制到 `src/dashboard/` 目录下直接预览效果。

### 启动可视化面板
1. 将生成的 `dongjian-graph.json` 复制到 `src/dashboard/` 目录下。
2. 启动本地服务：
   ```bash
   cd src/dashboard
   python3 -m http.server 8080
   ```
3. 在浏览器访问 `http://localhost:8080`。

### 功能操作
- **查看详情**：点击图谱中的节点，左侧面板会显示 AI 生成的职责摘要和架构层级。
- **搜索定位**：在搜索框输入关键词，实时高亮匹配的节点。
- **拖拽探索**：支持自由拖拽节点以调整视图布局。

## 🏗️ 技术栈

- **Parser**: Tree-sitter (TypeScript, JavaScript, Java)
- **Runtime**: Node.js / TypeScript
- **AI Engine**: Alibaba Cloud DashScope (Qwen3.7-max)
- **Visualization**: Cytoscape.js
- **CLI**: Commander.js

## 📝 开发计划

- [ ] 支持 Python、Go 等更多编程语言
- [ ] 集成 Git Hook 实现自动增量更新
- [ ] 增加代码片段预览与跳转功能
- [ ] 导出为 PDF 或图片报告

详细的技术设计与架构说明请查看 [docs/architecture.md](docs/architecture.md)。

## 📄 License

MIT
