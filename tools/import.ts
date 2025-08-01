import * as fs from 'fs';
import * as path from 'path';
import { SCRIPTS_DIR, writeText } from './utils';

/**
 * 生成main.ts文件
 */
export function generateMainTs(projectDir: string): void {
    // 校验目录有效性
    if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
        console.log(`Error: ${projectDir} is not a valid directory.`);
        return;
    }

    // 标准化路径并获取工程名称
    const absoluteProjectDir = path.resolve(projectDir);
    const projectName = path.basename(absoluteProjectDir);
    const mainTsPath = path.join(absoluteProjectDir, 'main.ts');

    const imports: string[] = [];

    // 遍历所有.ts文件
    function walkDirectory(dir: string): void {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                walkDirectory(fullPath);
            } else if (stat.isFile() && item.endsWith('.ts') && !item.startsWith('main.ts')) {
                // 获取相对于工程目录的路径
                const relPath = path.relative(absoluteProjectDir, fullPath);
                // 统一路径分隔符为正斜杠
                const normalizedPath = relPath.replace(/\\/g, '/');
                // 移除文件扩展名
                const pathNoExt = normalizedPath.replace(/\.ts$/, '');
                // 生成完整导入路径
                const importPath = `./${pathNoExt}`;

                imports.push(`import "${importPath}";`);
            }
        }
    }

    walkDirectory(absoluteProjectDir);

    // 写入main.ts文件
    const content = imports.join('\n');
    writeText(mainTsPath, content);

    console.log(`成功生成 main.ts，共导入 ${imports.length} 个文件。`);
    console.log(`文件位置: ${mainTsPath}`);
}

/**
 * 主函数
 */
export function main(): void {
    generateMainTs(SCRIPTS_DIR);
}

// 如果直接运行此文件
if (require.main === module) {
    main();
}