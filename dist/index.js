"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const project_scanner_1 = require("./parser/project-scanner");
const program = new commander_1.Command();
program
    .name('dongjian')
    .description('洞见：将代码库转化为可交互的知识图谱')
    .version('0.1.0');
program
    .command('scan <path>')
    .description('扫描指定路径下的代码项目并生成知识图谱')
    .action(async (path) => {
    console.log(`正在扫描项目: ${path}`);
    try {
        await (0, project_scanner_1.parseProject)(path);
        console.log('扫描完成！图谱已生成。');
    }
    catch (error) {
        console.error('扫描过程中发生错误:', error);
    }
});
program.parse();
