import { Command } from 'commander';
import { parseProject } from './parser/project-scanner';

const program = new Command();

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
      await parseProject(path);
      console.log('扫描完成！图谱已生成。');
    } catch (error) {
      console.error('扫描过程中发生错误:', error);
    }
  });

program.parse();
