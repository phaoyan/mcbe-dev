import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
    RESOURCE_PACK_DIR,
    BEHAVIOR_PACK_DIR,
    ENV_PATH,
    JSON_INDENT,
    readJson,
    writeJson,
    writeText,
    getProduct,
    getCustomDeploymentPath
} from './utils';

// 命名空间需满足：至少2个字母 + 下划线 + 至少2个字母（仅小写字母）
const NAMESPACE_REGEX = /^[a-z]{2,}_[a-z]{2,}$/;

function assertValidNamespace(namespace: string): void {
    if (!NAMESPACE_REGEX.test(namespace)) {
        throw new Error("命名空间格式不合法：需满足 '至少2个字母_至少2个字母'（仅小写字母），例如 'ab_cd'");
    }
}

/**
 * 设置项目
 */
export function setup(projectName: string): void {
    try {
        // 校验命名空间格式
        assertValidNamespace(projectName);

        // 重命名资源包和行为包文件夹
        const newResourcePackDir = path.join(path.dirname(RESOURCE_PACK_DIR), projectName);
        const newBehaviorPackDir = path.join(path.dirname(BEHAVIOR_PACK_DIR), projectName);

        if (fs.existsSync(RESOURCE_PACK_DIR)) {
            fs.renameSync(RESOURCE_PACK_DIR, newResourcePackDir);
        } else {
            console.warn(`资源包目录不存在: ${RESOURCE_PACK_DIR}`);
        }

        if (fs.existsSync(BEHAVIOR_PACK_DIR)) {
            fs.renameSync(BEHAVIOR_PACK_DIR, newBehaviorPackDir);
        } else {
            console.warn(`行为包目录不存在: ${BEHAVIOR_PACK_DIR}`);
        }

        // 基于命名空间创建 textures 和 sounds 的 团队名/项目名 目录
        const [teamName, projName] = projectName.split('_', 2);
        const texturesTargetDir = path.join(newResourcePackDir, 'textures', teamName, projName);
        const soundsTargetDir = path.join(newResourcePackDir, 'sounds', teamName, projName);
        fs.mkdirSync(texturesTargetDir, { recursive: true });
        fs.mkdirSync(soundsTargetDir, { recursive: true });

        // 更新环境变量文件
        const envContent = [
            `PROJECT_NAME="${projectName}"`,
            `MINECRAFT_PRODUCT="${getProduct()}"`,
            `CUSTOM_DEPLOYMENT_PATH="${getCustomDeploymentPath()}"`
        ].join('\n');
        writeText(ENV_PATH, envContent);

        // 生成UUID
        const resourceUuid = uuidv4();
        const behaviorUuid = uuidv4();
        const dataUuid = uuidv4();
        const scriptUuid = uuidv4();

        // 更新资源包manifest
        const resourceManifestFile = path.join(newResourcePackDir, "manifest.json");
        if (fs.existsSync(resourceManifestFile)) {
            const resourceManifest = readJson(resourceManifestFile);

            resourceManifest.header.name = `${projectName} Resource Pack`;
            resourceManifest.header.description = `${projectName} Resource Pack`;
            resourceManifest.header.uuid = resourceUuid;

            if (resourceManifest.dependencies && resourceManifest.dependencies[0]) {
                resourceManifest.dependencies[0].uuid = behaviorUuid;
            }

            writeJson(resourceManifestFile, resourceManifest);
        } else {
            console.warn(`资源包manifest文件不存在: ${resourceManifestFile}`);
        }

        // 更新行为包manifest
        const behaviorManifestFile = path.join(newBehaviorPackDir, "manifest.json");
        if (fs.existsSync(behaviorManifestFile)) {
            const behaviorManifest = readJson(behaviorManifestFile);

            behaviorManifest.header.name = `${projectName} Behavior Pack`;
            behaviorManifest.header.description = `${projectName} Behavior Pack`;
            behaviorManifest.header.uuid = behaviorUuid;

            if (behaviorManifest.dependencies && behaviorManifest.dependencies[0]) {
                behaviorManifest.dependencies[0].uuid = resourceUuid;
            }

            if (behaviorManifest.modules && behaviorManifest.modules[0]) {
                behaviorManifest.modules[0].uuid = dataUuid;
                behaviorManifest.modules[1].uuid = scriptUuid;
            }

            writeJson(behaviorManifestFile, behaviorManifest);
        } else {
            console.warn(`行为包manifest文件不存在: ${behaviorManifestFile}`);
        }

        console.log(`Project '${projectName}' setup complete.`);
        console.log("Resource pack UUID:", resourceUuid);
        console.log("Behavior pack UUID:", behaviorUuid);
        console.log("Script UUID:", scriptUuid);

    } catch (error) {
        console.error(`设置项目失败: ${error}`);
        throw error;
    }
}

/**
 * 主函数 - 从命令行参数获取项目名称
 */
export function main(): void {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error("错误: 请提供项目名称");
        console.log("用法: node setup.js <项目名称>");
        process.exit(1);
    }

    const projectName = args[0];
    // 入口处先行校验，避免继续执行
    if (!NAMESPACE_REGEX.test(projectName)) {
        console.error("错误: 命名空间格式不合法：需满足 '至少2个字母_至少2个字母'（仅小写字母），例如 'ab_cd'");
        process.exit(1);
    }
    setup(projectName);
    console.log(`Project '${projectName}' setup complete.`);
}

// 如果直接运行此文件
if (require.main === module) {
    main();
}