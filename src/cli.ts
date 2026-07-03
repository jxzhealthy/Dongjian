#!/usr/bin/env node

/**
 * Dongjian CLI 入口
 * 支持全局命令调用
 */

import { Command } from 'commander';
import { parseProject } from './parser/project-scanner';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

const program = new Command();

program
  .name('dongjian')
  .description('洞见：将代码库转化为可交互的知识图谱')
  .version('0.2.1');

program
  .command('scan <path>')
  .description('扫描指定路径下的代码库并生成知识图谱')
  .option('-o, --output <file>', '自定义输出文件名', 'dongjian-graph.json')
  .option('--exclude <patterns...>', '排除特定的文件夹或文件模式', ['node_modules', 'dist', '.git'])
  .action(async (path: string, options: any) => {
    console.log(`正在扫描项目: ${path}`);
    console.log(`输出文件: ${options.output}`);
    console.log(`排除模式: ${options.exclude.join(', ')}`);
    try {
      await parseProject(path, options.output, options.exclude);
      console.log('扫描完成！图谱已生成。');
    } catch (error) {
      console.error('扫描过程中发生错误:', error);
      process.exit(1);
    }
  });

program
  .command('view <graphPath>')
  .description('在浏览器中查看生成的知识图谱')
  .action((graphPath: string) => {
    const absolutePath = path.resolve(graphPath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`错误: 找不到文件 ${graphPath}`);
      process.exit(1);
    }

    try {
      const graphData = fs.readFileSync(absolutePath, 'utf8');
      // 读取 viewer.html 模板
      const viewerPath = path.join(__dirname, '../src/dashboard/viewer.html');
      let htmlTemplate = fs.readFileSync(viewerPath, 'utf8');
      
      // 注入数据
      const htmlContent = htmlTemplate.replace('{{GRAPH_DATA}}', graphData);

      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
      });

      const port = 3000;
      server.listen(port, () => {
        console.log(`\n🚀 图谱可视化服务已启动！`);
        console.log(`请在浏览器访问: http://localhost:${port}\n`);
        console.log(`按 Ctrl+C 停止服务`);
      });
    } catch (error) {
      console.error('启动查看器失败:', error);
      process.exit(1);
    }
  });

// 在主命令帮助信息后追加常用示例
program.addHelpText('afterAll', `
常用示例:
  dongjian scan . -o result.json    # 扫描当前目录并指定输出文件
  dongjian view result.json         # 在浏览器中查看生成的图谱
`);

program.parse();
