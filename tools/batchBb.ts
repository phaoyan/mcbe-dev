import * as fs from 'fs';
import * as path from 'path';
import {
    BBPACK_DIR,
    TOOLS_DIR,
    rglob,
    readJson,
    writeJson,
    ensureDir
} from './utils';

// 定义批处理配置文件目录
const BATCH_BB_DIR = path.join(TOOLS_DIR, 'batchbb');

// 配置文件路径
const CONFIG_FILES = {
    animationName: path.join(BATCH_BB_DIR, 'animation_name.json'),
    animationLength: path.join(BATCH_BB_DIR, 'animation_length.json'),
    animationLoop: path.join(BATCH_BB_DIR, 'animation_loop.json'),
    animationOverride: path.join(BATCH_BB_DIR, 'animation_override.json'),
    animationRemove: path.join(BATCH_BB_DIR, 'animation_remove.json'),
    animationCopy: path.join(BATCH_BB_DIR, 'animation_copy.json'),
    animationAttachable: path.join(BATCH_BB_DIR, 'animation_attachable.json'),
    bbmodelName: path.join(BATCH_BB_DIR, 'bbmodel_name.json')
};

// 需要在attachable动画提取时忽略的骨骼名称（不区分大小写）
const ATTACHABLE_IGNORE_BONES = ['root', 'body', 'waist', 'leftleg', 'rightleg', 'leftarm', 'rightarm', 'head'];

/**
 * 第一阶段：生成配置文件
 * 扫描所有bbmodel文件，提取动画信息并生成配置JSON
 */
function generateConfigs(): void {
    console.log('开始生成配置文件...');
    
    // 确保输出目录存在
    ensureDir(BATCH_BB_DIR);
    
    // 获取所有bbmodel文件
    const bbmodelFiles = rglob('\\.bbmodel$', BBPACK_DIR);
    
    if (bbmodelFiles.length === 0) {
        console.log('未找到任何bbmodel文件');
        return;
    }
    
    console.log(`找到 ${bbmodelFiles.length} 个bbmodel文件`);
    
    // 初始化配置对象
    const animationNameConfig: Record<string, string> = {};
    const animationLengthConfig: Record<string, number> = {};
    const animationLoopConfig: Record<string, string> = {};
    const animationOverrideConfig: Record<string, boolean> = {};
    const animationRemoveConfig: Record<string, boolean> = {};
    const animationCopyConfig: Record<string, string> = {};
    const animationAttachableConfig: Record<string, string> = {};
    const bbmodelNameConfig: Record<string, string> = {};
    
    // 遍历所有bbmodel文件
    for (const bbmodelFile of bbmodelFiles) {
        const basename = path.basename(bbmodelFile, '.bbmodel');
        const bbmodel = readJson(bbmodelFile);
        const animations = bbmodel.animations || [];
        
        // 添加文件名映射（键值相同）
        bbmodelNameConfig[basename] = basename;
        
        console.log(`处理文件: ${basename}, 动画数量: ${animations.length}`);
        
        // 遍历所有动画
        for (const animation of animations) {
            const animName = animation.name;
            if (!animName) {
                console.warn(`  警告: 发现未命名动画，跳过`);
                continue;
            }
            
            // 提取动画信息
            animationNameConfig[animName] = animName;
            animationLengthConfig[animName] = animation.length || 0;
            animationLoopConfig[animName] = animation.loop || 'once';
            animationOverrideConfig[animName] = animation.override || false;
            animationRemoveConfig[animName] = false;
            animationCopyConfig[animName] = '';
            animationAttachableConfig[animName] = '';
            
            console.log(`  - ${animName}: length=${animation.length}, loop=${animation.loop}, override=${animation.override}`);
        }
    }
    
    // 写入配置文件
    writeJson(CONFIG_FILES.animationName, animationNameConfig);
    writeJson(CONFIG_FILES.animationLength, animationLengthConfig);
    writeJson(CONFIG_FILES.animationLoop, animationLoopConfig);
    writeJson(CONFIG_FILES.animationOverride, animationOverrideConfig);
    writeJson(CONFIG_FILES.animationRemove, animationRemoveConfig);
    writeJson(CONFIG_FILES.animationCopy, animationCopyConfig);
    writeJson(CONFIG_FILES.animationAttachable, animationAttachableConfig);
    writeJson(CONFIG_FILES.bbmodelName, bbmodelNameConfig);
    
    console.log('\n配置文件生成完成！');
    console.log(`- animation_name.json: ${Object.keys(animationNameConfig).length} 个动画`);
    console.log(`- animation_length.json: ${Object.keys(animationLengthConfig).length} 个动画`);
    console.log(`- animation_loop.json: ${Object.keys(animationLoopConfig).length} 个动画`);
    console.log(`- animation_override.json: ${Object.keys(animationOverrideConfig).length} 个动画`);
    console.log(`- animation_remove.json: ${Object.keys(animationRemoveConfig).length} 个动画`);
    console.log(`- animation_copy.json: ${Object.keys(animationCopyConfig).length} 个动画`);
    console.log(`- animation_attachable.json: ${Object.keys(animationAttachableConfig).length} 个动画`);
    console.log(`- bbmodel_name.json: ${Object.keys(bbmodelNameConfig).length} 个文件`);
    console.log('\n请编辑这些文件，然后运行 "tsx tools/batchBb.ts apply" 应用修改');
}

/**
 * 第二阶段：应用修改
 * 读取配置文件，对比原始数据，将修改应用到bbmodel文件
 */
function applyChanges(): void {
    console.log('开始应用修改...');
    
    // 检查配置文件是否存在
    for (const [key, filePath] of Object.entries(CONFIG_FILES)) {
        if (!fs.existsSync(filePath)) {
            console.error(`错误: 配置文件不存在: ${filePath}`);
            console.log('请先运行 "tsx tools/batchBb.ts generate" 生成配置文件');
            return;
        }
    }
    
    // 读取配置文件
    const animationNameConfig: Record<string, string> = readJson(CONFIG_FILES.animationName);
    const animationLengthConfig: Record<string, number> = readJson(CONFIG_FILES.animationLength);
    const animationLoopConfig: Record<string, string> = readJson(CONFIG_FILES.animationLoop);
    const animationOverrideConfig: Record<string, boolean> = readJson(CONFIG_FILES.animationOverride);
    const animationRemoveConfig: Record<string, boolean> = readJson(CONFIG_FILES.animationRemove);
    const animationCopyConfig: Record<string, string> = readJson(CONFIG_FILES.animationCopy);
    const animationAttachableConfig: Record<string, string> = readJson(CONFIG_FILES.animationAttachable);
    const bbmodelNameConfig: Record<string, string> = readJson(CONFIG_FILES.bbmodelName);
    
    // 获取所有bbmodel文件
    const bbmodelFiles = rglob('\\.bbmodel$', BBPACK_DIR);
    
    if (bbmodelFiles.length === 0) {
        console.log('未找到任何bbmodel文件');
        return;
    }
    
    console.log(`找到 ${bbmodelFiles.length} 个bbmodel文件`);
    
    let totalChanges = 0;
    const filesToRename: Array<{ oldPath: string; newPath: string }> = [];
    
    // 遍历所有bbmodel文件
    for (const bbmodelFile of bbmodelFiles) {
        const basename = path.basename(bbmodelFile, '.bbmodel');
        const bbmodel = readJson(bbmodelFile);
        const animations = bbmodel.animations || [];
        
        console.log(`\n处理文件: ${basename}`);
        
        let fileChanged = false;
        let animationChanges = 0;
        
        // 第一步：处理动画复制
        const animationsToCopy: Array<{ source: any; newName: string }> = [];
        for (const animation of animations) {
            const originalName = animation.name;
            if (!originalName) continue;
            
            if (animationCopyConfig.hasOwnProperty(originalName)) {
                const newName = animationCopyConfig[originalName];
                // 如果新名称不为空且与原名称不同，则标记为需要复制
                if (newName && newName !== originalName && newName.trim() !== '') {
                    animationsToCopy.push({ source: animation, newName: newName.trim() });
                }
            }
        }
        
        // 执行复制操作
        for (const { source, newName } of animationsToCopy) {
            // 深拷贝动画对象
            const copiedAnimation = JSON.parse(JSON.stringify(source));
            copiedAnimation.name = newName;
            
            // 添加到动画数组
            animations.push(copiedAnimation);
            console.log(`  复制动画: "${source.name}" -> "${newName}"`);
            fileChanged = true;
            animationChanges++;
        }
        
        // 处理attachable动画提取复制
        const attachableAnimationsToCopy: Array<{ source: any; newName: string }> = [];
        for (const animation of animations) {
            const originalName = animation.name;
            if (!originalName) continue;
            
            if (animationAttachableConfig.hasOwnProperty(originalName)) {
                const newName = animationAttachableConfig[originalName];
                // 如果新名称不为空且与原名称不同，则标记为需要复制
                if (newName && newName !== originalName && newName.trim() !== '') {
                    attachableAnimationsToCopy.push({ source: animation, newName: newName.trim() });
                }
            }
        }
        
        // 执行attachable动画复制操作
        for (const { source, newName } of attachableAnimationsToCopy) {
            // 深拷贝动画对象
            const copiedAnimation = JSON.parse(JSON.stringify(source));
            copiedAnimation.name = newName;
            
            // 过滤掉不需要的animator（忽略玩家身体部分的骨骼动画）
            if (copiedAnimation.animators && typeof copiedAnimation.animators === 'object') {
                const filteredAnimators: any = {};
                
                for (const [animatorKey, animatorValue] of Object.entries(copiedAnimation.animators)) {
                    const animator = animatorValue as any;
                    const animatorName = (animator.name || '').toLowerCase();
                    
                    // 检查是否是需要忽略的骨骼
                    if (!ATTACHABLE_IGNORE_BONES.includes(animatorName)) {
                        filteredAnimators[animatorKey] = animatorValue;
                    }
                }
                
                copiedAnimation.animators = filteredAnimators;
            }
            
            // 添加到动画数组
            animations.push(copiedAnimation);
            console.log(`  提取attachable动画: "${source.name}" -> "${newName}" (已过滤玩家骨骼)`);
            fileChanged = true;
            animationChanges++;
        }
        
        // 第二步：遍历所有动画，应用修改
        for (const animation of animations) {
            const originalName = animation.name;
            if (!originalName) {
                continue;
            }
            
            // 检查动画名称是否需要修改
            if (animationNameConfig.hasOwnProperty(originalName)) {
                const newName = animationNameConfig[originalName];
                if (newName !== originalName) {
                    console.log(`  动画名称: "${originalName}" -> "${newName}"`);
                    animation.name = newName;
                    fileChanged = true;
                    animationChanges++;
                }
            }
            
            // 使用原始名称作为键来查找配置
            const configKey = originalName;
            
            // 检查动画长度是否需要修改
            if (animationLengthConfig.hasOwnProperty(configKey)) {
                const newLength = animationLengthConfig[configKey];
                if (newLength !== animation.length) {
                    console.log(`  ${originalName} - 长度: ${animation.length} -> ${newLength}`);
                    animation.length = newLength;
                    fileChanged = true;
                    animationChanges++;
                }
            }
            
            // 检查循环模式是否需要修改
            if (animationLoopConfig.hasOwnProperty(configKey)) {
                const newLoop = animationLoopConfig[configKey];
                if (newLoop !== animation.loop) {
                    console.log(`  ${originalName} - 循环模式: ${animation.loop} -> ${newLoop}`);
                    animation.loop = newLoop;
                    fileChanged = true;
                    animationChanges++;
                }
            }
            
            // 检查override属性是否需要修改
            if (animationOverrideConfig.hasOwnProperty(configKey)) {
                const newOverride = animationOverrideConfig[configKey];
                if (newOverride !== animation.override) {
                    console.log(`  ${originalName} - override: ${animation.override} -> ${newOverride}`);
                    animation.override = newOverride;
                    fileChanged = true;
                    animationChanges++;
                }
            }
        }
        
        // 第三步：处理动画删除
        const animationsToRemove: string[] = [];
        for (const animation of animations) {
            const originalName = animation.name;
            if (!originalName) continue;
            
            if (animationRemoveConfig.hasOwnProperty(originalName)) {
                const shouldRemove = animationRemoveConfig[originalName];
                if (shouldRemove === true) {
                    animationsToRemove.push(originalName);
                }
            }
        }
        
        // 执行删除操作
        if (animationsToRemove.length > 0) {
            // 过滤掉需要删除的动画
            bbmodel.animations = animations.filter((animation: any) => {
                return !animationsToRemove.includes(animation.name);
            });
            
            for (const animName of animationsToRemove) {
                console.log(`  删除动画: "${animName}"`);
                animationChanges++;
            }
            fileChanged = true;
        }
        
        // 如果文件有修改，保存
        if (fileChanged) {
            writeJson(bbmodelFile, bbmodel);
            console.log(`  ✓ 保存修改 (${animationChanges} 处修改)`);
            totalChanges += animationChanges;
        } else {
            console.log(`  - 无修改`);
        }
        
        // 检查文件名是否需要修改
        if (bbmodelNameConfig.hasOwnProperty(basename)) {
            const newBasename = bbmodelNameConfig[basename];
            if (newBasename !== basename) {
                const newPath = path.join(path.dirname(bbmodelFile), `${newBasename}.bbmodel`);
                filesToRename.push({ oldPath: bbmodelFile, newPath });
                console.log(`  文件名: ${basename} -> ${newBasename}`);
            }
        }
    }
    
    // 处理文件重命名
    if (filesToRename.length > 0) {
        console.log('\n开始重命名文件...');
        for (const { oldPath, newPath } of filesToRename) {
            // 检查目标文件是否已存在
            if (fs.existsSync(newPath)) {
                console.error(`  错误: 目标文件已存在: ${newPath}`);
                continue;
            }
            
            try {
                fs.renameSync(oldPath, newPath);
                console.log(`  ✓ ${path.basename(oldPath)} -> ${path.basename(newPath)}`);
                totalChanges++;
            } catch (error) {
                console.error(`  错误: 无法重命名文件: ${error}`);
            }
        }
    }
    
    console.log(`\n修改应用完成！总共 ${totalChanges} 处修改`);
    
    // 删除临时配置文件
    console.log('\n清理临时配置文件...');
    let deletedCount = 0;
    for (const [key, filePath] of Object.entries(CONFIG_FILES)) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`  ✓ 删除 ${path.basename(filePath)}`);
                deletedCount++;
            }
        } catch (error) {
            console.warn(`  警告: 无法删除 ${path.basename(filePath)}: ${error}`);
        }
    }
    console.log(`已删除 ${deletedCount} 个配置文件`);
}

/**
 * 主函数 - 命令行接口
 */
export function main(): void {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (!command) {
        console.log('批量修改bbmodel配置脚本');
        console.log('\n用法:');
        console.log('  tsx tools/batchBb.ts generate  - 生成配置文件');
        console.log('  tsx tools/batchBb.ts apply     - 应用修改');
        console.log('\n说明:');
        console.log('  1. 首先运行 generate 命令生成配置文件');
        console.log('  2. 编辑生成的JSON配置文件 (在 tools/batchbb/ 目录)');
        console.log('  3. 运行 apply 命令应用修改到bbmodel文件');
        return;
    }
    
    switch (command.toLowerCase()) {
        case 'generate':
        case 'gen':
        case 'g':
            generateConfigs();
            break;
        case 'apply':
        case 'app':
        case 'a':
            applyChanges();
            break;
        default:
            console.error(`未知命令: ${command}`);
            console.log('使用 "generate" 或 "apply"');
            break;
    }
}

// 如果直接运行此文件
if (require.main === module) {
    main();
}

export { generateConfigs, applyChanges };

