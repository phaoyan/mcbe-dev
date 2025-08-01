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
    writeText
} from './utils';

/**
 * 设置项目
 */
export function setup(projectName: string): void {
    try {
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

        // 更新环境变量文件
        const envContent = [
            `PROJECT_NAME="${projectName}"`,
            'MINECRAFT_PRODUCT="BedrockUWP"',
            'CUSTOM_DEPLOYMENT_PATH=""'
        ].join('\n');
        writeText(ENV_PATH, envContent);

        // 生成UUID
        const resourceUuid = uuidv4();
        const behaviorUuid = uuidv4();
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
                behaviorManifest.modules[0].uuid = scriptUuid;
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
    setup(projectName);
    console.log(`Project '${projectName}' setup complete.`);
}

// 如果直接运行此文件
if (require.main === module) {
    main();
}