import * as fs from 'fs';
import * as path from 'path';
import {
    BBPACK_DIR,
    RESOURCE_PACK_DIR,
    rglob,
    readJson,
    writeJson,
    ensureDir,
    NAME_SPACE
} from './utils';

// 动画名称前缀
const ANIMATION_PREFIX = `animation.${NAME_SPACE}.`;

interface MissingReference {
    directory: string;
    bbmodelFile: string;
    missingId: string;
}

/**
 * 检查粒子引用关系
 */
export function checkParticleReferences(): void {
    console.log("开始检查bbmodel与particle.json文件的引用关系...");
    console.log("=".repeat(60));

    let totalDirs = 0;
    let totalMissing = 0;
    const missingReferences: MissingReference[] = [];

    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));

    for (const subdir of subdirs) {
        totalDirs++;
        const subdirName = path.basename(subdir);
        console.log(`\n检查目录: ${subdirName}`);

        const bbmodelFiles = rglob('.*\\.bbmodel$', subdir);
        const particleFiles = rglob('.*\\.particle\\.json$', subdir);

        if (bbmodelFiles.length === 0) {
            console.log("  警告：目录中没有找到.bbmodel文件");
            continue;
        }

        const availableParticleIds = getParticleIds(particleFiles);
        console.log(`  找到 ${particleFiles.length} 个particle.json文件`);

        if (particleFiles.length > 0) {
            console.log(`  可用的粒子ID: ${Array.from(availableParticleIds).join(', ')}`);
        }

        for (const bbmodelFile of bbmodelFiles) {
            console.log(`  检查bbmodel: ${path.basename(bbmodelFile)}`);
            const missingIds = checkSingleBbmodel(bbmodelFile, availableParticleIds);

            if (missingIds.length > 0) {
                totalMissing += missingIds.length;
                console.log(`    ❌ 找到 ${missingIds.length} 个缺失的粒子引用`);

                for (const missingId of missingIds) {
                    missingReferences.push({
                        directory: subdirName,
                        bbmodelFile: path.basename(bbmodelFile),
                        missingId
                    });
                }
            } else {
                console.log("    ✅ 所有粒子引用都正常");
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("检查完成！");
    console.log(`总共检查了 ${totalDirs} 个目录`);
    console.log(`总共发现 ${totalMissing} 个缺失的粒子引用`);

    if (missingReferences.length > 0) {
        console.log("\n" + "=".repeat(60));
        console.log("缺失的粒子引用详细列表：");
        console.log("=".repeat(60));

        let currentDir = "";
        for (const ref of missingReferences) {
            if (ref.directory !== currentDir) {
                currentDir = ref.directory;
                console.log(`\n📁 目录: ${currentDir}`);
            }
            console.log(`  🔸 文件: ${ref.bbmodelFile}`);
            console.log(`    ❌ 缺失ID: ${ref.missingId}`);
        }
    } else {
        console.log("\n🎉 所有bbmodel文件的粒子引用都正常！");
    }
}

/**
 * 从particle文件列表中提取粒子ID
 */
function getParticleIds(particleFiles: string[]): Set<string> {
    const particleIds = new Set<string>();

    for (const particleFile of particleFiles) {
        try {
            const data = readJson(particleFile);
            const identifier = data.particle_effect?.description?.identifier || '';

            let particleId: string;
            if (identifier.includes(':')) {
                particleId = identifier.split(':')[1];
            } else {
                particleId = identifier;
            }

            if (particleId) {
                particleIds.add(particleId);
            }
        } catch (error) {
            console.log(`    警告：读取particle文件 ${path.basename(particleFile)} 时出错: ${error}`);
        }
    }

    return particleIds;
}

/**
 * 检查单个bbmodel文件中的粒子引用
 */
function checkSingleBbmodel(bbmodelFile: string, availableParticleIds: Set<string>): string[] {
    const missingIds: string[] = [];

    try {
        const data = readJson(bbmodelFile);
        const animations = data.animations || [];

        if (animations.length === 0) {
            console.log(`    信息：${path.basename(bbmodelFile)} 没有animations，这是正常的`);
            return missingIds;
        }

        for (const animation of animations) {
            if (!animation || typeof animation !== 'object') {
                continue;
            }

            const animators = animation.animators || {};
            if (typeof animators !== 'object') {
                continue;
            }

            const effects = animators.effects || {};
            if (typeof effects !== 'object') {
                continue;
            }

            const keyframes = effects.keyframes || [];
            if (!Array.isArray(keyframes)) {
                continue;
            }

            for (const keyframe of keyframes) {
                if (!keyframe || typeof keyframe !== 'object') {
                    continue;
                }

                if (keyframe.channel !== 'particle') {
                    continue;
                }

                const dataPoints = keyframe.data_points || [];
                if (!Array.isArray(dataPoints)) {
                    continue;
                }

                for (const dataPoint of dataPoints) {
                    if (!dataPoint || typeof dataPoint !== 'object') {
                        continue;
                    }

                    const effectId = dataPoint.effect || '';
                    if (effectId && !availableParticleIds.has(effectId)) {
                        if (!missingIds.includes(effectId)) {
                            missingIds.push(effectId);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log(`    错误：读取bbmodel文件 ${path.basename(bbmodelFile)} 时出错: ${error}`);
    }

    return missingIds;
}

/**
 * 复制bbpack文件
 */
export function copyBbpackFiles(): void {
    renameBbmodelFiles();

    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    const particlesTargetDir = path.join(RESOURCE_PACK_DIR, "particles");
    ensureDir(particlesTargetDir);

    console.log("开始复制bbpack中的particle文件...");
    console.log("=".repeat(60));

    // 清空particles文件夹中的.particle.json文件
    console.log("🧹 正在清空particles文件夹...");
    const particleFilesToRemove = rglob('.*\\.particle\\.json$', particlesTargetDir);
    let removedParticleCount = 0;

    for (const fileToRemove of particleFilesToRemove) {
        try {
            fs.unlinkSync(fileToRemove);
            removedParticleCount++;
        } catch (error) {
            console.log(`  ⚠️  删除文件失败 ${path.basename(fileToRemove)}: ${error}`);
        }
    }

    if (removedParticleCount > 0) {
        console.log(`  🗑️  删除了 ${removedParticleCount} 个旧的particle文件`);
    } else {
        console.log("  ℹ️  particles文件夹中没有旧文件需要删除");
    }

    console.log("\n📁 开始复制particle文件...");

    let totalDirs = 0;
    let totalParticleFiles = 0;

    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));

    for (const subdir of subdirs) {
        totalDirs++;
        const subdirName = path.basename(subdir);
        console.log(`\n处理目录: ${subdirName}`);

        const bbmodelFiles = rglob('.*\\.bbmodel$', subdir);
        const particleFiles = rglob('.*\\.particle\\.json$', subdir);

        for (const particleFile of particleFiles) {
            try {
                const targetPath = path.join(particlesTargetDir, path.basename(particleFile));
                fs.copyFileSync(particleFile, targetPath);
                console.log(`  ✅ 复制particle: ${path.basename(particleFile)} -> particles/`);
                totalParticleFiles++;
            } catch (error) {
                console.log(`  ❌ 复制particle失败 ${path.basename(particleFile)}: ${error}`);
            }
        }

        if (bbmodelFiles.length > 0 || particleFiles.length > 0) {
            console.log(`  📊 目录统计: ${bbmodelFiles.length} 个bbmodel文件(无需复制), ${particleFiles.length} 个particle文件`);
        } else {
            console.log("  ℹ️  目录中没有找到bbmodel或particle文件");
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("复制完成！");
    console.log(`总共处理了 ${totalDirs} 个目录`);
    console.log(`复制了 ${totalParticleFiles} 个particle文件到 ${particlesTargetDir}`);
    console.log("ℹ️  bbmodel文件无需复制，处理程序将直接从bbpack文件夹读取");
}

/**
 * 重命名bbmodel文件
 */
function renameBbmodelFiles(): void {
    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    console.log("开始重命名bbmodel文件...");
    console.log("=".repeat(60));

    let totalDirs = 0;
    let totalRenamed = 0;

    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));

    for (const subdir of subdirs) {
        totalDirs++;
        const subdirName = path.basename(subdir);
        console.log(`\n处理目录: ${subdirName}`);

        const bbmodelFiles = rglob('.*\\.bbmodel$', subdir);

        if (bbmodelFiles.length === 0) {
            console.log("  ℹ️  目录中没有找到bbmodel文件");
            continue;
        } else if (bbmodelFiles.length > 1) {
            console.log(`  ⚠️  目录中找到多个bbmodel文件: ${bbmodelFiles.map(f => path.basename(f)).join(', ')}`);
            console.log("  ⚠️  跳过重命名以避免冲突");
            continue;
        }

        const bbmodelFile = bbmodelFiles[0];
        const expectedName = `${subdirName}.bbmodel`;

        if (path.basename(bbmodelFile) === expectedName) {
            console.log(`  ✅ 文件名已正确: ${path.basename(bbmodelFile)}`);
        } else {
            try {
                const newPath = path.join(subdir, expectedName);
                fs.renameSync(bbmodelFile, newPath);
                console.log(`  🔄 重命名: ${path.basename(bbmodelFile)} -> ${expectedName}`);
                totalRenamed++;
            } catch (error) {
                console.log(`  ❌ 重命名失败 ${path.basename(bbmodelFile)}: ${error}`);
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("重命名完成！");
    console.log(`总共处理了 ${totalDirs} 个目录`);
    console.log(`成功重命名了 ${totalRenamed} 个bbmodel文件`);
}

/**
 * 检查动画名称规范
 */
export function checkAnimationNames(): void {
    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    let totalDirs = 0;
    let totalFiles = 0;
    let totalFixed = 0;

    console.log("开始检查bbmodel文件中的动画名称规范...");
    console.log("=".repeat(60));

    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));

    for (const subdir of subdirs) {
        totalDirs++;
        const bbmodelFiles = rglob('.*\\.bbmodel$', subdir);

        for (const bbmodelFile of bbmodelFiles) {
            totalFiles++;
            try {
                const data = readJson(bbmodelFile);
                let fileModified = false;

                if (data.animations && Array.isArray(data.animations)) {
                    for (let i = 0; i < data.animations.length; i++) {
                        const animation = data.animations[i];
                        if (animation && typeof animation === 'object' && animation.name) {
                            const name = animation.name;

                            if (!isValidAnimationName(name)) {
                                console.log(`\n❌ 发现不符合规范的动画名称：`);
                                console.log(`📁 文件: ${path.relative(BBPACK_DIR, bbmodelFile)}`);
                                console.log(`🎬 当前名称: ${name}`);
                                console.log("\n规范要求：");
                                console.log(`1. 必须以 '${ANIMATION_PREFIX}' 开头`);
                                console.log("2. 仅能包含小写字母、下划线、数字和小数点");

                                // 在TypeScript版本中，我们可以生成一个建议的名称而不是要求用户输入
                                const suggestedName = generateValidAnimationName(name);
                                data.animations[i].name = suggestedName;
                                fileModified = true;
                                totalFixed++;
                                console.log(`✅ 名称已自动修改: ${name} -> ${suggestedName}`);
                            }
                        }
                    }
                }

                if (fileModified) {
                    writeJson(bbmodelFile, data);
                    console.log(`💾 文件已保存: ${path.relative(BBPACK_DIR, bbmodelFile)}`);
                }
            } catch (error) {
                console.log(`读取文件 ${path.relative(BBPACK_DIR, bbmodelFile)} 时出错: ${error}`);
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("检查完成！");
    console.log(`总共检查了 ${totalDirs} 个目录中的 ${totalFiles} 个bbmodel文件`);
    if (totalFixed > 0) {
        console.log(`✅ 成功修复了 ${totalFixed} 个不规范的动画名称`);
    } else {
        console.log("✅ 所有动画名称都符合规范！");
    }
    console.log("=".repeat(60));
}

/**
 * 检查动画名称是否符合规范
 */
function isValidAnimationName(name: string): boolean {
    // 检查是否以动画前缀开头
    if (!name.startsWith(ANIMATION_PREFIX)) {
        return false;
    }

    // 检查是否仅包含小写字母、下划线、数字和小数点
    const pattern = /^[a-z0-9_.]+$/;
    if (!pattern.test(name)) {
        return false;
    }

    // 检查在前缀后是否有实际的动画名称
    const suffix = name.substring(ANIMATION_PREFIX.length);
    if (!suffix || suffix.endsWith('.')) {
        return false;
    }

    return true;
}

/**
 * 生成符合规范的动画名称
 */
function generateValidAnimationName(name: string): string {
    // 如果已经符合规范，直接返回
    if (isValidAnimationName(name)) {
        return name;
    }

    // 移除不符合规范的字符，转为小写
    let cleanName = name.toLowerCase().replace(/[^a-z0-9_.]/g, '_');

    // 确保以正确的前缀开头
    if (!cleanName.startsWith(ANIMATION_PREFIX)) {
        if (cleanName.startsWith('animation.')) {
            cleanName = cleanName.replace('animation.', ANIMATION_PREFIX);
        } else {
            cleanName = `${ANIMATION_PREFIX}${cleanName}`;
        }
    }

    // 确保不以点结尾
    cleanName = cleanName.replace(/\.+$/, '');

    return cleanName;
}

/**
 * 综合处理bbpack文件 - 包括检查和复制
 */
export function processBbpackFiles(): void {
    console.log("🚀 开始处理bbpack文件...");
    console.log("=".repeat(80));

    console.log("\n📝 第一步：检查动画名称规范");
    console.log("-".repeat(40));
    checkAnimationNames();

    console.log("\n🔍 第二步：检查粒子引用关系");
    console.log("-".repeat(40));
    checkParticleReferences();

    console.log("\n📋 第三步：复制bbpack文件");
    console.log("-".repeat(40));
    copyBbpackFiles();

    console.log("\n" + "=".repeat(80));
    console.log("🎉 bbpack文件处理完成！");
    console.log("=".repeat(80));
}

// 如果直接运行此文件
if (require.main === module) {
    processBbpackFiles();
}