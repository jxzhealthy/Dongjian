# Dongjian (洞见) 架构设计文档

## 1. 项目愿景
Dongjian 旨在解决大型代码库中“全局视角缺失”的痛点。通过结合 **Tree-sitter** 的确定性解析能力与 **LLM** 的语义理解能力，将静态代码转化为动态、可交互的知识图谱。

## 2. 核心架构
系统采用分层架构设计，确保各模块职责清晰：

| 模块 | 职责 | 技术选型 |
| :--- | :--- | :--- |
| **Parser Layer** | 结构提取 | Tree-sitter (TypeScript/JavaScript) |
| **Agent Layer** | 语义增强 | Qwen3.7-max (DashScope API) |
| **Core Layer** | 增量同步 | SHA-256 Hashing |
| **Visualization** | 交互展示 | Cytoscape.js + Local HTTP Server |

## 3. 数据流向
1. **扫描 (Scan)**: CLI 接收目标路径，递归遍历文件。
2. **解析 (Parse)**: Tree-sitter 提取类、函数、接口及调用关系。
3. **分析 (Analyze)**: AI Agent 对每个文件进行业务逻辑总结与架构分层。
4. **存储 (Store)**: 生成标准化的 `dongjian-graph.json`。
5. **渲染 (Render)**: Dashboard 加载 JSON 并绘制交互式拓扑图。

## 4. 关键技术决策
- **为什么选择 Tree-sitter？** 
  相比正则表达式，Tree-sitter 能构建精确的抽象语法树（AST），确保依赖提取的准确性。
- **为什么采用本地化部署？**
  为了保障企业级代码的安全性，所有解析和可视化过程均在本地完成，仅语义分析阶段需联网调用 LLM。
- **增量同步机制：**
  通过比对文件哈希值，仅对变动文件及其依赖链进行重新扫描，将大规模项目的扫描时间从分钟级降低到秒级。

## 5. 未来演进
- **多语言支持**: 引入 Java, Python, Go 的 Tree-sitter 语法包。
- **Git 集成**: 通过 `post-commit` Hook 实现代码提交即更新图谱。
- **深度搜索**: 支持基于自然语言的代码逻辑检索（如：“查找所有处理用户登录的函数”）。
