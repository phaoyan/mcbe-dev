#!/usr/bin/env node

/**
 * Minecraft Bedrock 开发工具集 - TypeScript版本
 * 
 * 这是Python脚本工程的TypeScript等效版本，提供以下功能：
 * - 批量生成behavior pack和resource pack资源
 * - 解析和处理bbmodel文件
 * - 处理bbpack文件夹中的资源
 * - 生成项目配置和引用文件
 * - 项目初始化和设置
 */

import * as path from 'path';
import { deployAllDialogues } from './dialogue';

// 显示帮助信息
function showHelp(): void {
    console.log(`
Minecraft Bedrock 开发工具集 - TypeScript版本

用法:
  node main.ts <命令> [参数]

命令:
  setup <项目名称>     - 初始化项目，设置项目名称和UUID
  batch-bp            - 批量生成behavior pack资源
  batch-rp            - 批量生成resource pack资源
  bbmodel [--force]   - 处理bbmodel文件，导出纹理、几何体和动画（使用 --force 或 -f 强制全部重新部署）
  bbpack              - 处理bbpack文件夹：检查动画名称、检查粒子引用、复制文件
  bbpack-check        - 仅检查bbpack中的粒子引用
  bbpack-names        - 仅检查和修复动画名称规范
  bbpack-ids          - 检查并修复粒子ID命名空间
  dialogue            - 部署所有已配置的任务对话（MissionDialogueList → generated_dialogue.scene.json）
  import              - 生成TypeScript项目的main.ts导入文件
  reference           - 生成资源引用配置JSON文件
  resources           - 生成资源配置（纹理、声音等）
  all [--force]       - 执行完整的资源生成流程 (bbpack→bbmodel→batch-bp→batch-rp→resources→reference→import)
  from-bbmodel [--force] - 从bbmodel开始的资源生成流程
  help                - 显示此帮助信息

选项:
  --force, -f         - 强制全部重新部署（用于 bbmodel, all, from-bbmodel 命令）
  --prune-particles   - 开启“严格同步”：会删除 resource_packs/<项目名>/particles 里那些不在 bbpack/particles 中的 .particle.json（默认关闭，避免误删手动维护的粒子）

示例:
  node main.ts setup my_project
  node main.ts batch-bp
  node main.ts bbmodel              # 增量部署（只部署有修改的文件）
  node main.ts bbmodel --force      # 强制全部重新部署
  node main.ts bbpack-check
  node main.ts all -f               # 强制全部重新部署
  node main.ts all --prune-particles
`);
}

// 主函数
async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showHelp();
        return;
    }

    const command = args[0];
    const pruneParticles = args.includes('--prune-particles') || args.includes('--prune');
    const force = args.includes('--force') || args.includes('-f');

    try {
        switch (command) {
            case 'setup': {
                if (args.length < 2) {
                    console.error('错误: setup命令需要项目名称参数');
                    console.log('用法: node main.ts setup <项目名称>');
                    process.exit(1);
                }
                const { setup } = await import('./setup');
                setup(args[1]);
                break;
            }

            case 'batch-bp': {
                const { main: batchBpMain } = await import('./batchBp');
                await batchBpMain();
                console.log('✅ Behavior pack 资源生成完成');
                break;
            }

            case 'batch-rp': {
                const { main: batchRpMain } = await import('./batchRp');
                await batchRpMain();
                console.log('✅ Resource pack 资源生成完成');
                break;
            }

            case 'bbmodel': {
                const { setupBbmodels } = await import('./bbmodel');
                setupBbmodels();
                console.log('✅ BBModel 文件处理完成');
                break;
            }

            case 'bbpack': {
                const { processBbpackFiles } = await import('./bbpack');
                await processBbpackFiles({ pruneParticles });
                break;
            }

            case 'bbpack-check': {
                const { checkParticleReferences } = await import('./bbpack');
                await checkParticleReferences();
                break;
            }

            case 'bbpack-names': {
                const { checkAnimationIds } = await import('./bbpack');
                await checkAnimationIds();
                break;
            }

            case 'bbpack-ids': {
                const { checkParticleIds } = await import('./bbpack');
                await checkParticleIds();
                break;
            }

            case 'dialogue': {
                const { deployAllDialogues, exportDialogueMarkdown } = await import('./dialogue');
                deployAllDialogues();
                exportDialogueMarkdown();

                // 生成/刷新 scripts/refs/ref.json，保证 dialogue_scenes / dialogue_events 更新
                const { main: referenceMain } = await import('./reference');
                await referenceMain();

                console.log('✅ 所有任务对话部署完成（并已刷新 ref.json）');
                break;
            }

            case 'import': {
                const { main: importMain } = await import('./import');
                importMain();
                console.log('✅ 导入文件生成完成');
                break;
            }

            case 'reference': {
                const { main: referenceMain } = await import('./reference');
                await referenceMain();
                console.log('✅ 引用配置文件生成完成');
                break;
            }

            case 'resources': {
                const { main: resourcesMain } = await import('./resources');
                await resourcesMain();
                console.log('✅ 资源配置文件生成完成');
                break;
            }

            case 'all': {
                console.log('🚀 开始执行完整的资源生成流程...');

                // 1. 处理bbpack文件
                console.log('📁 处理bbpack文件...');
                const { processBbpackFiles } = await import('./bbpack');
                // force 当前版本未在 bbpack/bbmodel 内部透传使用，这里先解析保留，避免以后扩展 breaking
                void force;
                await processBbpackFiles({ pruneParticles });

                // 2. 处理bbmodel文件
                console.log('🎨 处理bbmodel文件...');
                const { setupBbmodels } = await import('./bbmodel');
                setupBbmodels();

                // 3. 生成behavior pack资源
                console.log('⚙️  生成behavior pack资源...');
                const { main: batchBpMain } = await import('./batchBp');
                await batchBpMain();
                deployAllDialogues();

                // 4. 生成resource pack资源
                console.log('🎭 生成resource pack资源...');
                const { main: batchRpMain } = await import('./batchRp');
                await batchRpMain();

                // 5. 生成资源配置文件
                console.log('📋 生成资源配置文件...');
                const { main: resourcesMain } = await import('./resources');
                await resourcesMain();

                // 6. 生成引用配置文件
                console.log('🔗 生成引用配置文件...');
                const { main: referenceMain } = await import('./reference');
                await referenceMain();

                // 7. 生成TypeScript导入文件
                console.log('📦 生成TypeScript导入文件...');
                const { main: importMain } = await import('./import');
                importMain();

                console.log('🎉 完整的资源生成流程执行完成！');
                break;
            }

            case 'from-bbmodel': {
                // 2. 处理bbmodel文件
                console.log('🎨 处理bbmodel文件...');
                const { setupBbmodels } = await import('./bbmodel');
                setupBbmodels();

                // 3. 生成behavior pack资源
                console.log('⚙️  生成behavior pack资源...');
                const { main: batchBpMain } = await import('./batchBp');
                await batchBpMain();

                // 4. 生成resource pack资源
                console.log('🎭 生成resource pack资源...');
                const { main: batchRpMain } = await import('./batchRp');
                await batchRpMain();

                // 5. 生成资源配置文件
                console.log('📋 生成资源配置文件...');
                const { main: resourcesMain } = await import('./resources');
                await resourcesMain();

                // 6. 生成引用配置文件
                console.log('🔗 生成引用配置文件...');
                const { main: referenceMain } = await import('./reference');
                await referenceMain();

                // 7. 生成TypeScript导入文件
                console.log('📦 生成TypeScript导入文件...');
                const { main: importMain } = await import('./import');
                importMain();

                console.log('🎉 完整的资源生成流程执行完成！');
                break;
            }

            case 'from-batch': {
                // 3. 生成behavior pack资源
                console.log('⚙️  生成behavior pack资源...');
                const { main: batchBpMain } = await import('./batchBp');
                await batchBpMain();

                // 4. 生成resource pack资源
                console.log('🎭 生成resource pack资源...');
                const { main: batchRpMain } = await import('./batchRp');
                await batchRpMain();

                // 5. 生成资源配置文件
                console.log('📋 生成资源配置文件...');
                const { main: resourcesMain } = await import('./resources');
                await resourcesMain();

                // 6. 生成引用配置文件
                console.log('🔗 生成引用配置文件...');
                const { main: referenceMain } = await import('./reference');
                await referenceMain();

                // 7. 生成TypeScript导入文件
                console.log('📦 生成TypeScript导入文件...');
                const { main: importMain } = await import('./import');
                importMain();

                console.log('🎉 完整的资源生成流程执行完成！');
                break;
            }

            case 'help':
            case '--help':
            case '-h': {
                showHelp();
                break;
            }

            default: {
                console.error(`错误: 未知命令 "${command}"`);
                console.log('使用 "node main.ts help" 查看可用命令');
                process.exit(1);
            }
        }
    } catch (error) {
        console.error(`执行命令 "${command}" 时出错:`, error);
        process.exit(1);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch((error) => {
        console.error('程序执行失败:', error);
        process.exit(1);
    });
}

export { main };