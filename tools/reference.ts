import * as fs from 'fs';
import * as path from 'path';
import {
    BEHAVIOR_PACK_DIR,
    RESOURCE_PACK_DIR,
    SCRIPTS_DIR,
    rglob,
    readJson,
    writeJson,
    ensureDir,
    readText,
    writeText,
    NAME_SPACE,
    BBPACK_DIR
} from './utils';

/**
 * 递归列出 rootDir 下的所有子目录（返回绝对路径），包含空目录
 */
function listAllSubDirs(rootDir: string): string[] {
    const result: string[] = [];
    if (!fs.existsSync(rootDir)) return result;

    const stack: string[] = [rootDir];
    while (stack.length > 0) {
        const dir = stack.pop()!;
        let items: string[] = [];
        try {
            items = fs.readdirSync(dir);
        } catch {
            continue;
        }

        for (const item of items) {
            const full = path.join(dir, item);
            let stat: fs.Stats | undefined;
            try {
                stat = fs.statSync(full);
            } catch {
                continue;
            }
            if (stat.isDirectory()) {
                result.push(full);
                stack.push(full);
            }
        }
    }
    return result;
}

/**
 * 确保 tree 中存在某个目录路径对应的对象节点（空目录则最终为 {}）
 * - 若节点被文件占用（string），则转换为 { _value: old }
 */
function ensureNestedObject(dictionary: any, keys: string[]): void {
    if (!keys.length) return;
    let current = dictionary;
    for (const key of keys) {
        if (!(key in current)) {
            current[key] = {};
        } else if (typeof current[key] === 'string') {
            const oldValue = current[key];
            current[key] = { "_value": oldValue };
        } else if (current[key] == null || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
}

/**
 * 扫描 rootDir 下所有子目录，并在 tree 中为其生成对应 key（空目录值为 {}）
 */
function ensureDirKeys(rootDir: string, tree: any): void {
    const dirs = listAllSubDirs(rootDir);
    for (const dir of dirs) {
        const rel = path.relative(rootDir, dir).replace(/\\/g, '/');
        const keys = rel.split('/').filter(Boolean);
        ensureNestedObject(tree, keys);
    }
}

function isExistingDir(p: string): boolean {
    try {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
    } catch {
        return false;
    }
}

/**
 * 生成物品ID引用
 */
export function itemIdRefs(): void {
    const itemIds: any = {};

    const itemsDir = path.join(BEHAVIOR_PACK_DIR, "items");
    // 先把目录结构写入 tree，确保空文件夹也会生成 key（值为 {}）
    ensureDirKeys(itemsDir, itemIds);
    const itemFiles = rglob('.*\\.item\\.json$', itemsDir);
    for (const itemFile of itemFiles) {
        try {
            const itemData = readJson(itemFile);
            const itemId = itemData["minecraft:item"].description.identifier;

            // 基于 items 目录下的相对路径构建嵌套键，例如:
            // items/weapons/sword.item.json -> weapons.sword
            const rel = path.relative(itemsDir, itemFile).replace(/\\/g, '/');
            const nameWithoutSuffix = rel.replace(/\.item\.json$/, '');
            const keys = nameWithoutSuffix.split('/').filter(Boolean);
            if (keys.length > 0) {
                setNestedValue(itemIds, keys, itemId);
            }
        } catch (error) {
            console.error(`读取物品文件失败 ${itemFile}: ${error}`);
        }
    }

    // 写入树形结构
    const treePath = path.join(SCRIPTS_DIR, "json", "item_tree.json");
    ensureDir(path.dirname(treePath));
    writeJson(treePath, itemIds);

    // 写入扁平结构
    const flatItemIds = flattenMapping(itemIds);
    const flatPath = path.join(SCRIPTS_DIR, "json", "item_ids.json");
    writeJson(flatPath, flatItemIds);
}

/**
 * 生成实体ID引用
 */
export function entityIdRefs(): void {
    const entityIds: any = {};

    const entitiesDir = path.join(BEHAVIOR_PACK_DIR, "entities");
    // 先把目录结构写入 tree，确保空文件夹也会生成 key（值为 {}）
    ensureDirKeys(entitiesDir, entityIds);
    const entityFiles = rglob('.*\\.se\\.json$', entitiesDir);
    for (const entityFile of entityFiles) {
        try {
            const entityData = readJson(entityFile);
            const entityId = entityData["minecraft:entity"].description.identifier;

            // 基于 entities 目录下的相对路径构建嵌套键，例如:
            // entities/mobs/zombie.se.json -> mobs.zombie
            const rel = path.relative(entitiesDir, entityFile).replace(/\\/g, '/');
            const nameWithoutSuffix = rel.replace(/\.se\.json$/, '');
            const keys = nameWithoutSuffix.split('/').filter(Boolean);
            if (keys.length > 0) {
                setNestedValue(entityIds, keys, entityId);
            }
        } catch (error) {
            console.error(`读取实体文件失败 ${entityFile}: ${error}`);
        }
    }

    // 写入树形结构
    const treePath = path.join(SCRIPTS_DIR, "json", "entity_tree.json");
    ensureDir(path.dirname(treePath));
    writeJson(treePath, entityIds);

    // 写入扁平结构
    const flatEntityIds = flattenMapping(entityIds);
    const flatPath = path.join(SCRIPTS_DIR, "json", "entity_ids.json");
    writeJson(flatPath, flatEntityIds);
}

export function blockIdRefs(): void {
    const blockIds: any = {};
    // 兼容两种目录布局：
    // 1) behavior_packs/<project>/blocks
    // 2) behavior_packs/blocks（你的工程目前就是这种）
    const packsRoot = path.dirname(BEHAVIOR_PACK_DIR); // .../behavior_packs
    const blocksDirs = [
        path.join(BEHAVIOR_PACK_DIR, "blocks"),
        path.join(packsRoot, "blocks"),
    ].filter(isExistingDir);

    for (const blocksDir of blocksDirs) {
        // 先把目录结构写入 tree，确保空文件夹也会生成 key（值为 {}）
        ensureDirKeys(blocksDir, blockIds);

        const blockFiles = rglob('.*\\.block\\.json$', blocksDir);
        for (const blockFile of blockFiles) {
            try {
                const blockData = readJson(blockFile);
                const blockId = blockData["minecraft:block"].description.identifier;
                const rel = path.relative(blocksDir, blockFile).replace(/\\/g, '/');
                const nameWithoutSuffix = rel.replace(/\.block\.json$/, '');
                const keys = nameWithoutSuffix.split('/').filter(Boolean);
                if (keys.length > 0) {
                    setNestedValue(blockIds, keys, blockId);
                }
            }
            catch (error) {
                console.error(`读取方块文件失败 ${blockFile}: ${error}`);
            }
        }
    }
    const treePath = path.join(SCRIPTS_DIR, "json", "block_tree.json");
    ensureDir(path.dirname(treePath));
    writeJson(treePath, blockIds);

    const flatBlockIds = flattenMapping(blockIds);
    const flatPath = path.join(SCRIPTS_DIR, "json", "block_ids.json");
    writeJson(flatPath, flatBlockIds);
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

    // 写入树形结构
    const treePath = path.join(SCRIPTS_DIR, "json", "animation_tree.json");
    ensureDir(path.dirname(treePath));
    writeJson(treePath, animationIds);

    // 写入扁平结构
    const flatAnimationIds = flattenMapping(animationIds);
    const flatPath = path.join(SCRIPTS_DIR, "json", "animation_ids.json");
    writeJson(flatPath, flatAnimationIds);

    // 同时输出动画长度信息
    const lengthOutputPath = path.join(SCRIPTS_DIR, "json", "animation_length.json");
    writeJson(lengthOutputPath, animationLengths);
}

/**
 * 扁平化嵌套映射对象，将多层键以 "." 连接成一层键
 * - 若遇到对象内含有 "_value"，则为当前层级也生成一条键值映射
 */
function flattenMapping(tree: any, parentKeys: string[] = []): Record<string, string> {
    const flat: Record<string, string> = {};
    if (tree == null) return flat;

    const isString = typeof tree === 'string';
    if (isString) {
        const v = tree as string;
        flat[v] = v;
        return flat;
    }

    if (typeof tree === 'object') {
        // 若包含 _value，生成当前层级的映射
        if (typeof tree._value === 'string') {
            const v = tree._value as string;
            flat[v] = v;
        }

        for (const key of Object.keys(tree)) {
            if (key === '_value') continue;
            const value = tree[key];
            const nextKeys = parentKeys.concat(key);
            const childFlat = flattenMapping(value, nextKeys);
            for (const k of Object.keys(childFlat)) {
                flat[k] = childFlat[k];
            }
        }
    }
    return flat;
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
 * 生成实体动画引用
 * 扫描 @entity/ 文件夹中的 .ce.json 文件
 * 从中抽取 ID 作为 key，animations 作为值
 */
export function entityAnimationsRefs(): void {
    const entityAnimations: Record<string, Record<string, string>> = {};

    const entityDir = path.join(RESOURCE_PACK_DIR, "entity");
    const entityFiles = rglob('.*\\.ce\\.json$', entityDir);

    for (const entityFile of entityFiles) {
        try {
            const entityData = readJson(entityFile);
            const clientEntity = entityData["minecraft:client_entity"];

            if (!clientEntity || !clientEntity.description) {
                console.warn(`跳过无效的客户端实体文件: ${entityFile}`);
                continue;
            }

            const identifier = clientEntity.description.identifier;
            const animations = clientEntity.description.animations || {};

            // 只有当存在动画时才添加到映射中
            if (identifier && Object.keys(animations).length > 0) {
                entityAnimations[identifier] = animations;
            }
        } catch (error) {
            console.error(`读取客户端实体文件失败 ${entityFile}: ${error}`);
        }
    }

    // 写入实体动画引用文件
    const outputPath = path.join(SCRIPTS_DIR, "json", "entity_animations.json");
    ensureDir(path.dirname(outputPath));
    writeJson(outputPath, entityAnimations);

    console.log(`已生成 entity_animations.json，共 ${Object.keys(entityAnimations).length} 个实体`);
}

export function attachableAnimationsRefs(): void {
    const attAnimations: Record<string, Record<string, string>> = {};

    const attDir = path.join(RESOURCE_PACK_DIR, "attachables", "items");
    const attFiles = rglob('.*\\.att\\.json$', attDir);

    for (const attFile of attFiles) {
        try {
            const attData = readJson(attFile);
            const att = attData["minecraft:attachable"];

            if (!att || !att.description) {
                console.warn(`跳过无效的附着物文件: ${attFile}`);
                continue;
            }

            const identifier = att.description.identifier;
            const animations = att.description.animations || {};

            // 只有当存在动画时才添加到映射中
            if (identifier && Object.keys(animations).length > 0) {
                attAnimations[identifier] = animations;
            }
        } catch (error) {
            console.error(`读取附着物文件失败 ${attFile}: ${error}`);
        }
    }

    // 写入实体动画引用文件
    const outputPath = path.join(SCRIPTS_DIR, "json", "attachable_animations.json");
    ensureDir(path.dirname(outputPath));
    writeJson(outputPath, attAnimations);

    console.log(`已生成 attachable_animations.json，共 ${Object.keys(attAnimations).length} 个实体`);
}

/**
 * 生成结构文件（.mcstructure）ID 引用
 * 规则：
 * - 命名空间为 behavior_packs 下 structures 文件夹的第一层子文件夹名
 * - 名称为结构文件名（不含扩展名）
 * 例如：
 * - behavior_packs/…/structures/ns_gl/boss_alex_base.mcstructure
 *   -> ID 为 ns_gl:boss_alex_base
 */
export function mcstructureRefs(): void {
    const structuresRoot = path.join(BEHAVIOR_PACK_DIR, "structures");
    const tree: any = {};

    // 先把目录结构写入 tree，确保空文件夹也会生成 key（值为 {}）
    // 注意：structures 的第一层子目录即命名空间（同样会被写入 tree）
    ensureDirKeys(structuresRoot, tree);

    const files = rglob('.*\\.mcstructure$', structuresRoot);
    for (const file of files) {
        try {
            const rel = path.relative(structuresRoot, file).replace(/\\/g, "/");
            const parts = rel.split("/").filter(Boolean);
            if (parts.length === 0) continue;

            // 第一段为命名空间
            const namespace = parts[0];
            const fileName = parts[parts.length - 1];
            const baseName = fileName.replace(/\.mcstructure$/, "");

            const id = `${namespace}:${baseName}`;

            // 使用 setNestedValue 生成树结构：
            // [namespace, ...(中间子目录), baseName] -> id
            const middle = parts.slice(1, -1);
            const keys = [namespace, ...middle, baseName];
            setNestedValue(tree, keys, id);
        } catch (error) {
            console.error(`读取结构文件失败 ${file}: ${error}`);
        }
    }

    const treePath = path.join(SCRIPTS_DIR, "json", "structure_tree.json");
    ensureDir(path.dirname(treePath));
    writeJson(treePath, tree);

    const flatIds = flattenMapping(tree);
    const flatPath = path.join(SCRIPTS_DIR, "json", "structure_ids.json");
    writeJson(flatPath, flatIds);
}

/**
 * 生成聚合引用文件 ref.json（与 scripts/main.ts 同级）
 * - 只输出一个文件：scripts/refs/ref.json
 * - 内容结构与之前 scripts/json/*.json 一致（key 为原文件名去掉 .json）
 */
export function refJson(): void {
    const refPath = path.join(SCRIPTS_DIR, "refs", "ref.json");
    const ref: Record<string, any> = {};

    // item
    {
        const itemTree: any = {};
        const itemsDir = path.join(BEHAVIOR_PACK_DIR, "items");
        ensureDirKeys(itemsDir, itemTree);
        const itemFiles = rglob('.*\\.item\\.json$', itemsDir);
        for (const itemFile of itemFiles) {
            try {
                const itemData = readJson(itemFile);
                const itemId = itemData["minecraft:item"].description.identifier;
                const rel = path.relative(itemsDir, itemFile).replace(/\\/g, '/');
                const nameWithoutSuffix = rel.replace(/\.item\.json$/, '');
                const keys = nameWithoutSuffix.split('/').filter(Boolean);
                if (keys.length > 0) setNestedValue(itemTree, keys, itemId);
            } catch (error) {
                console.error(`读取物品文件失败 ${itemFile}: ${error}`);
            }
        }
        ref["item_tree"] = itemTree;
        ref["item_ids"] = flattenMapping(itemTree);
    }

    // entity
    {
        const entityTree: any = {};
        const entitiesDir = path.join(BEHAVIOR_PACK_DIR, "entities");
        ensureDirKeys(entitiesDir, entityTree);
        const entityFiles = rglob('.*\\.se\\.json$', entitiesDir);
        for (const entityFile of entityFiles) {
            try {
                const entityData = readJson(entityFile);
                const entityId = entityData["minecraft:entity"].description.identifier;
                const rel = path.relative(entitiesDir, entityFile).replace(/\\/g, '/');
                const nameWithoutSuffix = rel.replace(/\.se\.json$/, '');
                const keys = nameWithoutSuffix.split('/').filter(Boolean);
                if (keys.length > 0) setNestedValue(entityTree, keys, entityId);
            } catch (error) {
                console.error(`读取实体文件失败 ${entityFile}: ${error}`);
            }
        }
        ref["entity_tree"] = entityTree;
        ref["entity_ids"] = flattenMapping(entityTree);
    }

    // block
    {
        const blockTree: any = {};
        const packsRoot = path.dirname(BEHAVIOR_PACK_DIR); // .../behavior_packs
        const blocksDirs = [
            path.join(BEHAVIOR_PACK_DIR, "blocks"),
            path.join(packsRoot, "blocks"),
        ].filter(isExistingDir);

        for (const blocksDir of blocksDirs) {
            ensureDirKeys(blocksDir, blockTree);
            const blockFiles = rglob('.*\\.block\\.json$', blocksDir);
            for (const blockFile of blockFiles) {
                try {
                    const blockData = readJson(blockFile);
                    const blockId = blockData["minecraft:block"].description.identifier;
                    const rel = path.relative(blocksDir, blockFile).replace(/\\/g, '/');
                    const nameWithoutSuffix = rel.replace(/\.block\.json$/, '');
                    const keys = nameWithoutSuffix.split('/').filter(Boolean);
                    if (keys.length > 0) setNestedValue(blockTree, keys, blockId);
                }
                catch (error) {
                    console.error(`读取方块文件失败 ${blockFile}: ${error}`);
                }
            }
        }
        ref["block_tree"] = blockTree;
        ref["block_ids"] = flattenMapping(blockTree);
    }

    // animation (+length)
    {
        const animationTree: any = {};
        const animationLengths: Record<string, number> = {};

        const animationFiles = rglob('.*\\.animation\\.json$', RESOURCE_PACK_DIR);
        for (const animationFile of animationFiles) {
            try {
                const animationData = readJson(animationFile);
                const animations = animationData.animations || {};

                for (const animation of Object.keys(animations)) {
                    const cleanName = animation.replace("animation.", "");
                    const keys = cleanName.split(".");
                    setNestedValue(animationTree, keys, animation);

                    const animationObj = animations[animation];
                    if (animationObj && typeof animationObj.animation_length === 'number') {
                        animationLengths[animation] = animationObj.animation_length;
                    } else {
                        animationLengths[animation] = 0;
                    }
                }
            } catch (error) {
                console.error(`读取动画文件失败 ${animationFile}: ${error}`);
            }
        }

        ref["animation_tree"] = animationTree;
        ref["animation_ids"] = flattenMapping(animationTree);
        ref["animation_length"] = animationLengths;
    }

    // structures
    {
        const structuresRoot = path.join(BEHAVIOR_PACK_DIR, "structures");
        const structureTree: any = {};
        ensureDirKeys(structuresRoot, structureTree);

        const files = rglob('.*\\.mcstructure$', structuresRoot);
        for (const file of files) {
            try {
                const rel = path.relative(structuresRoot, file).replace(/\\/g, "/");
                const parts = rel.split("/").filter(Boolean);
                if (parts.length === 0) continue;

                const namespace = parts[0];
                const fileName = parts[parts.length - 1];
                const baseName = fileName.replace(/\.mcstructure$/, "");
                const id = `${namespace}:${baseName}`;

                const middle = parts.slice(1, -1);
                const keys = [namespace, ...middle, baseName];
                setNestedValue(structureTree, keys, id);
            } catch (error) {
                console.error(`读取结构文件失败 ${file}: ${error}`);
            }
        }

        ref["structure_tree"] = structureTree;
        ref["structure_ids"] = flattenMapping(structureTree);
    }

    // particle
    {
        const particleIds: Record<string, string> = {};
        const particleFiles = rglob('.*\\.particle\\.json$', RESOURCE_PACK_DIR);
        for (const particleFile of particleFiles) {
            try {
                const particleData = readJson(particleFile);
                const particleId = particleData.particle_effect.description.identifier;
                const shortId = particleId.split(':').pop() || '';
                if (shortId) particleIds[shortId] = particleId;
            } catch (error) {
                console.error(`读取粒子文件失败 ${particleFile}: ${error}`);
            }
        }
        ref["particle_ids"] = particleIds;
    }

    // sound
    {
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
        ref["sound_ids"] = soundIds;
    }

    // entity animations
    {
        const entityAnimations: Record<string, Record<string, string>> = {};
        const entityDir = path.join(RESOURCE_PACK_DIR, "entity");
        const entityFiles = rglob('.*\\.ce\\.json$', entityDir);
        for (const entityFile of entityFiles) {
            try {
                const entityData = readJson(entityFile);
                const clientEntity = entityData["minecraft:client_entity"];
                if (!clientEntity || !clientEntity.description) continue;

                const identifier = clientEntity.description.identifier;
                const animations = clientEntity.description.animations || {};
                if (identifier && Object.keys(animations).length > 0) {
                    entityAnimations[identifier] = animations;
                }
            } catch (error) {
                console.error(`读取客户端实体文件失败 ${entityFile}: ${error}`);
            }
        }
        ref["entity_animations"] = entityAnimations;
    }

    // attachable animations
    {
        const attAnimations: Record<string, Record<string, string>> = {};
        const attDir = path.join(RESOURCE_PACK_DIR, "attachables", "items");
        const attFiles = rglob('.*\\.att\\.json$', attDir);
        for (const attFile of attFiles) {
            try {
                const attData = readJson(attFile);
                const att = attData["minecraft:attachable"];
                if (!att || !att.description) continue;

                const identifier = att.description.identifier;
                const animations = att.description.animations || {};
                if (identifier && Object.keys(animations).length > 0) {
                    attAnimations[identifier] = animations;
                }
            } catch (error) {
                console.error(`读取附着物文件失败 ${attFile}: ${error}`);
            }
        }
        ref["attachable_animations"] = attAnimations;
    }

    // bbmodel.json
    {
        const bbmodel = readJson(path.join(BBPACK_DIR, "bbmodel.json"));
        ref["bbmodel"] = bbmodel;
    }

    // 命名空间
    ref["name_space"] = NAME_SPACE;

    ensureDir(path.dirname(refPath));
    writeJson(refPath, ref);
}

/**
 * 主函数
 */
export async function main(): Promise<void> {
    refJson();
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}