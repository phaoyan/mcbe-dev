import * as path from 'path';
import {
    BEHAVIOR_PACK_DIR,
    RESOURCE_PACK_DIR,
    SCRIPTS_DIR,
    JSON_INDENT,
    rglob,
    readJson,
    writeJson,
    ensureDir
} from './utils';

/**
 * 生成物品ID引用
 */
export function itemIdRefs(): void {
    const itemIds: Record<string, string> = {};

    const itemFiles = rglob('.*\\.item\\.json$', BEHAVIOR_PACK_DIR);
    for (const itemFile of itemFiles) {
        try {
            const itemData = readJson(itemFile);
            const itemId = itemData["minecraft:item"].description.identifier;
            const shortId = itemId.split(':').pop() || '';
            if (shortId) {
                itemIds[shortId] = itemId;
            }
        } catch (error) {
            console.error(`读取物品文件失败 ${itemFile}: ${error}`);
        }
    }

    const outputPath = path.join(SCRIPTS_DIR, "json", "item_ids.json");
    ensureDir(path.dirname(outputPath));
    writeJson(outputPath, itemIds);
}

/**
 * 生成实体ID引用
 */
export function entityIdRefs(): void {
    const entityIds: Record<string, string> = {};

    const entityFiles = rglob('.*\\.se\\.json$', BEHAVIOR_PACK_DIR);
    for (const entityFile of entityFiles) {
        try {
            const entityData = readJson(entityFile);
            const entityId = entityData["minecraft:entity"].description.identifier;
            const shortId = entityId.split(':').pop() || '';
            if (shortId) {
                entityIds[shortId] = entityId;
            }
        } catch (error) {
            console.error(`读取实体文件失败 ${entityFile}: ${error}`);
        }
    }

    const outputPath = path.join(SCRIPTS_DIR, "json", "entity_ids.json");
    ensureDir(path.dirname(outputPath));
    writeJson(outputPath, entityIds);
}

/**
 * 递归设置嵌套字典的值，处理冲突情况
 */
function setNestedValue(dictionary: any, keys: string[], value: string): void {
    let current = dictionary;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
            current[key] = {};
        } else if (typeof current[key] === 'string') {
            // 如果当前键的值是字符串（叶子节点），需要转换为字典
            // 将原字符串值保存到特殊键_value下
            const oldValue = current[key];
            current[key] = { "_value": oldValue };
        }
        current = current[key];
    }

    // 设置最终值
    const finalKey = keys[keys.length - 1];
    if (finalKey in current && typeof current[finalKey] === 'object') {
        // 如果最终键已经是字典（有子节点），将当前值保存到_value
        current[finalKey]["_value"] = value;
    } else {
        current[finalKey] = value;
    }
}

/**
 * 生成动画ID引用
 */
export function animationIdRefs(): void {
    const animationIds: any = {};
    const animationLengths: Record<string, number> = {};

    const animationFiles = rglob('.*\\.animation\\.json$', RESOURCE_PACK_DIR);
    for (const animationFile of animationFiles) {
        try {
            const animationData = readJson(animationFile);
            const animations = animationData.animations || {};

            for (const animation of Object.keys(animations)) {
                // 移除 "animation." 前缀
                const cleanName = animation.replace("animation.", "");
                // 按"."分割成层级
                const keys = cleanName.split(".");
                // 设置嵌套值
                setNestedValue(animationIds, keys, animation);

                // 提取动画长度信息
                const animationObj = animations[animation];
                if (animationObj && typeof animationObj.animation_length === 'number') {
                    animationLengths[animation] = animationObj.animation_length;
                } else {
                    // 对于没有animation_length的动画，输出0
                    animationLengths[animation] = 0;
                }
            }
        } catch (error) {
            console.error(`读取动画文件失败 ${animationFile}: ${error}`);
        }
    }

    const outputPath = path.join(SCRIPTS_DIR, "json", "animation_ids.json");
    ensureDir(path.dirname(outputPath));
    writeJson(outputPath, animationIds);

    // 同时输出动画长度信息
    const lengthOutputPath = path.join(SCRIPTS_DIR, "json", "animation_length.json");
    writeJson(lengthOutputPath, animationLengths);
}

/**
 * 生成粒子ID引用
 */
export function particleIdRefs(): void {
    const particleIds: Record<string, string> = {};

    const particleFiles = rglob('.*\\.particle\\.json$', RESOURCE_PACK_DIR);
    for (const particleFile of particleFiles) {
        try {
            const particleData = readJson(particleFile);
            const particleId = particleData.particle_effect.description.identifier;
            const shortId = particleId.split(':').pop() || '';
            if (shortId) {
                particleIds[shortId] = particleId;
            }
        } catch (error) {
            console.error(`读取粒子文件失败 ${particleFile}: ${error}`);
        }
    }

    const outputPath = path.join(SCRIPTS_DIR, "json", "particle_ids.json");
    ensureDir(path.dirname(outputPath));
    writeJson(outputPath, particleIds);
}

/**
 * 生成声音ID引用
 */
export function soundIdRefs(): void {
    const soundIds: Record<string, string> = {};

    const soundDefFiles = rglob('sound_definitions\\.json$', RESOURCE_PACK_DIR);
    for (const soundDefFile of soundDefFiles) {
        try {
            const soundData = readJson(soundDefFile);
            const soundDefinitions = soundData.sound_definitions || {};

            for (const soundId of Object.keys(soundDefinitions)) {
                const key = soundId.replace(/\./g, "_");
                soundIds[key] = soundId;
            }
        } catch (error) {
            console.error(`读取声音定义文件失败 ${soundDefFile}: ${error}`);
        }
    }

    const outputPath = path.join(SCRIPTS_DIR, "json", "sound_ids.json");
    ensureDir(path.dirname(outputPath));
    writeJson(outputPath, soundIds);
}

/**
 * 主函数
 */
export async function main(): Promise<void> {
    itemIdRefs();
    entityIdRefs();
    animationIdRefs();
    particleIdRefs();
    soundIdRefs();
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}