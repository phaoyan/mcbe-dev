import * as path from 'path';
import * as fs from 'fs';
import {
    BEHAVIOR_PACK_DIR,
    RESOURCE_PACK_DIR,
    SCRIPTS_DIR,
    TOOLS_DIR,
    rglob,
    readJson,
    writeJson,
    writeText,
    ensureDir,
    NAME_SPACE,
    wrapNamespace
} from './utils';
import ref from '../scripts/refs/ref';

/**
 * 生成物品纹理列表
 */
export function generateItemTextureList(): void {
    const itemIdsPath = path.join(SCRIPTS_DIR, "json", "item_ids.json");
    const data = readJson(itemIdsPath);
    const names = Object.keys(data).map(k => `${k}.item.json`);

    const targetPath = path.join(TOOLS_DIR, "outputs", "item_texture_list.txt");
    ensureDir(path.dirname(targetPath));
    writeText(targetPath, names.join('\n'));
}

/**
 * 设置物品纹理JSON
 */
export function setupItemTextureJson(): void {
    const itemDir = path.join(BEHAVIOR_PACK_DIR, "items");
    const itemTexturePath = path.join(RESOURCE_PACK_DIR, "textures", "item_texture.json");
    const [teamName, projName] = NAME_SPACE.split('_', 2);
    const itemTexturesDir = path.join(RESOURCE_PACK_DIR, "textures", teamName, projName, "items");
    const entityDir = path.join(RESOURCE_PACK_DIR, "entity");

    if (!fs.existsSync(itemTexturePath)) {
        console.warn(`物品纹理配置文件不存在: ${itemTexturePath}`);
        return;
    }

    const itemTextureJson = readJson(itemTexturePath);
    if (!itemTextureJson.texture_data) {
        itemTextureJson.texture_data = {};
    }

    // 清理重复命名空间的脏数据
    for (const key of Object.keys(itemTextureJson.texture_data)) {
        if (key.startsWith(`${NAME_SPACE}:${NAME_SPACE}:`)) {
            delete itemTextureJson.texture_data[key];
        }
    }

    // 获取所有PNG纹理文件名（不含扩展名）
    const itemTextureNames = new Set<string>();
    if (fs.existsSync(itemTexturesDir)) {
        const pngFiles = rglob('.*\\.png$', itemTexturesDir);
        for (const pngFile of pngFiles) {
            const basename = path.basename(pngFile, '.png');
            itemTextureNames.add(basename);
        }
    }

    // 处理所有物品文件
    const itemFiles = rglob('.*\\.json$', itemDir);
    for (const itemFile of itemFiles) {
        try {
            const itemId = path.basename(itemFile, '.json').replace('.item', '');
            const textureKey = wrapNamespace(itemId);

            if (itemTextureNames.has(itemId)) {
                // 迁移旧的无命名空间key，避免重复
                if (textureKey !== itemId && itemTextureJson.texture_data[itemId]) {
                    delete itemTextureJson.texture_data[itemId];
                }

                itemTextureJson.texture_data[textureKey] = {
                    textures: `textures/${teamName}/${projName}/items/${itemId}`
                };
            } else {
                if (textureKey !== itemId && itemTextureJson.texture_data[itemId]) {
                    delete itemTextureJson.texture_data[itemId];
                }

                itemTextureJson.texture_data[textureKey] = {
                    textures: `textures/${teamName}/${projName}/empty`
                };
            }
        } catch (error) {
            console.error(`处理物品文件失败 ${itemFile}: ${error}`);
        }
    }

    // 扫描实体文件中的生物蛋纹理（spawn_egg.texture），也加入到物品纹理中
    if (fs.existsSync(entityDir)) {
        const entityFiles = rglob('.*\\.ce\\.json$', entityDir);
        for (const entityFile of entityFiles) {
            try {
                const data = readJson(entityFile);
                const clientEntity = data["minecraft:client_entity"];
                const description = clientEntity && clientEntity.description;
                const spawnEgg = description && description.spawn_egg;

                if (spawnEgg && typeof spawnEgg.texture === "string") {
                    const textureId = spawnEgg.texture;
                    const textureKey = wrapNamespace(textureId);
                    const fileName = textureId.includes(':') ? textureId.split(':')[1] : textureId;

                    // 迁移旧的无命名空间key，避免重复
                    if (textureKey !== textureId && itemTextureJson.texture_data[textureId]) {
                        delete itemTextureJson.texture_data[textureId];
                    }

                    // 如果该纹理ID还没有在texture_data中定义，则新增一条
                    if (!itemTextureJson.texture_data[textureKey]) {
                        const hasTexture = itemTextureNames.has(fileName);
                        itemTextureJson.texture_data[textureKey] = {
                            textures: hasTexture
                                ? `textures/${teamName}/${projName}/items/${fileName}`
                                : `textures/${teamName}/${projName}/empty`
                        };
                    }
                }
            } catch (error) {
                console.error(`处理实体文件失败 ${entityFile}: ${error}`);
            }
        }
    }

    writeJson(itemTexturePath, itemTextureJson);
}

export function setupTerrainTextureJson(): void {
    const terrainTexturePath = path.join(RESOURCE_PACK_DIR, "textures", "terrain_texture.json");

    if (!fs.existsSync(terrainTexturePath)) {
        console.warn(`地形纹理配置文件不存在: ${terrainTexturePath}`);
        return;
    }

    const terrainTextureJson = readJson(terrainTexturePath);
    if (!terrainTextureJson.texture_data) {
        terrainTextureJson.texture_data = {};
    }

    const [teamName, projName] = NAME_SPACE.split('_', 2);
    const blocksDir = path.join(BEHAVIOR_PACK_DIR, "blocks");
    const texturesDir = path.join(RESOURCE_PACK_DIR, "textures");

    // 收集所有方块文件中使用的纹理引用
    const textureRefs = new Set<string>();

    if (fs.existsSync(blocksDir)) {
        const blockFiles = rglob('.*\\.block\\.json$', blocksDir);
        for (const blockFile of blockFiles) {
            try {
                const blockData = readJson(blockFile);
                const block = blockData["minecraft:block"];
                const components = block && block.components;
                const materialInstances = components && components["minecraft:material_instances"];

                if (materialInstances && typeof materialInstances === 'object') {
                    // 遍历所有材质实例（如 "*", "up", "down" 等）
                    for (const key in materialInstances) {
                        const instance = materialInstances[key];
                        if (instance && typeof instance.texture === 'string') {
                            textureRefs.add(instance.texture);
                        }
                    }
                }
            } catch (error) {
                console.error(`处理方块文件失败 ${blockFile}: ${error}`);
            }
        }
    }

    // 为每个纹理引用查找对应的PNG文件并添加到texture_data
    for (const textureRef of textureRefs) {
        // 解析纹理引用：格式为 "namespace:texture_name" 或 "namespace:path/to/texture"
        let textureName = textureRef.trim();
        const colonIndex = textureName.indexOf(':');
        if (colonIndex >= 0) {
            textureName = textureName.substring(colonIndex + 1);
        }

        // 尝试查找对应的PNG文件
        const candidates: string[] = [];

        // 如果textureName已经包含路径分隔符
        if (textureName.includes('/')) {
            candidates.push(path.join(texturesDir, `${textureName}.png`));
            candidates.push(path.join(texturesDir, teamName, projName, `${textureName}.png`));
        } else {
            // 尝试多个可能的路径
            candidates.push(path.join(texturesDir, `${textureName}.png`));
            candidates.push(path.join(texturesDir, teamName, projName, `${textureName}.png`));
            candidates.push(path.join(texturesDir, teamName, projName, "blocks", `${textureName}.png`));
            candidates.push(path.join(texturesDir, teamName, projName, "common", `${textureName}.png`));
        }

        // 查找存在的PNG文件
        let foundTexturePath: string | null = null;
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                foundTexturePath = candidate;
                break;
            }
        }

        if (foundTexturePath) {
            // 计算相对于textures目录的路径（不含.png扩展名）
            const relativePath = path.relative(texturesDir, foundTexturePath);
            const texturePath = relativePath.replace(/\\/g, '/').replace(/\.png$/, '');

            // 添加到texture_data，使用textureRef作为key
            terrainTextureJson.texture_data[textureRef] = {
                textures: [`textures/${texturePath}`]
            };
        } else {
            console.warn(`未找到纹理文件: ${textureRef}，尝试的路径: ${candidates.join(', ')}`);
        }
    }

    writeJson(terrainTexturePath, terrainTextureJson);
}
/**
 * 部署物品纹理
 */
export function deployItemTexture(): void {
    const itemDir = path.join(BEHAVIOR_PACK_DIR, "items");
    const itemFiles = rglob('.*\\.json$', itemDir);

    for (const itemFile of itemFiles) {
        try {
            const data = readJson(itemFile);
            const itemId = path.basename(itemFile, '.json').replace('.item', '');

            if (data["minecraft:item"] && data["minecraft:item"].components) {
                data["minecraft:item"].components["minecraft:icon"] = wrapNamespace(itemId);
                writeJson(itemFile, data);
            }
        } catch (error) {
            console.error(`部署物品纹理失败 ${itemFile}: ${error}`);
        }
    }
}

/**
 * 部署实体 spawn_egg.texture 的命名空间（与 item_texture.json 的 key 对齐）
 */
export function deploySpawnEggTextureNamespace(): void {
    const entityDir = path.join(RESOURCE_PACK_DIR, "entity");
    if (!fs.existsSync(entityDir)) return;

    const entityFiles = rglob('.*\\.ce\\.json$', entityDir);
    for (const entityFile of entityFiles) {
        try {
            const data = readJson(entityFile);
            const clientEntity = data["minecraft:client_entity"];
            const description = clientEntity && clientEntity.description;
            const spawnEgg = description && description.spawn_egg;

            if (spawnEgg && typeof spawnEgg.texture === "string") {
                const original = spawnEgg.texture;
                const wrapped = wrapNamespace(original);
                if (wrapped !== original) {
                    spawnEgg.texture = wrapped;
                    writeJson(entityFile, data);
                }
            }
        } catch (error) {
            console.error(`部署 spawn_egg.texture 命名空间失败 ${entityFile}: ${error}`);
        }
    }
}

/**
 * 设置声音定义
 */
export function setupSoundsDefinition(): void {
    const soundsDir = path.join(RESOURCE_PACK_DIR, "sounds");
    const defPath = path.join(soundsDir, "sound_definitions.json");

    if (!fs.existsSync(defPath)) {
        console.warn(`声音定义文件不存在: ${defPath}`);
        return;
    }

    const defJson = readJson(defPath);
    if (!defJson.sound_definitions) {
        defJson.sound_definitions = {};
    }

    // 查找所有OGG声音文件
    const oggFiles = rglob('.*\\.ogg$', soundsDir);
    for (const soundFile of oggFiles) {
        try {
            // 获取相对于sounds目录的路径
            const relativePath = path.relative(soundsDir, soundFile);
            const soundPath = `sounds/${relativePath.replace(/\\/g, '/').replace(/\.ogg$/, '')}`;

            // 生成声音ID（将路径中的/和\替换为.）
            const soundId = relativePath.replace(/[/\\]/g, '.').replace(/\.ogg$/, '');

            defJson.sound_definitions[soundId] = {
                category: "player",
                max_distance: 64.0,
                sounds: [{
                    name: soundPath,
                    volume: 1.0,
                    is3D: false,

                }]
            };
        } catch (error) {
            console.error(`处理声音文件失败 ${soundFile}: ${error}`);
        }
    }

    writeJson(defPath, defJson);
}

/**
 * 将ID转换为可读的名称
 * 例如: "armor_arata_suit_1" -> "Armor Arata Suit 1"
 */
function idToDisplayName(id: string): string {
    // 移除命名空间前缀（如果有）
    let name = id;
    const colonIndex = name.indexOf(':');
    if (colonIndex >= 0) {
        name = name.substring(colonIndex + 1);
    }

    // 将下划线替换为空格，并将每个单词首字母大写
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * 生成语言文件（en_US.lang）
 */
export function generateLangFile(): void {
    const targetPath = path.join(TOOLS_DIR, "outputs", "en_US.lang");

    ensureDir(path.dirname(targetPath));

    const lines: string[] = [];

    // 读取物品ID
    const itemIds = ref.item_ids
    const itemKeys = Object.keys(itemIds).sort();

    for (const itemId of itemKeys) {
        const displayName = idToDisplayName(itemId);
        lines.push(`item.${itemId}=${displayName}`);
    }

    // 读取实体ID
    const entityIds = ref.entity_ids
    const entityKeys = Object.keys(entityIds).sort();

    // 添加空行分隔
    if (lines.length > 0) {
        lines.push('');
    }

    for (const entityId of entityKeys) {
        const displayName = idToDisplayName(entityId);
        // 实体名称
        lines.push(`entity.${entityId}.name=${displayName}`);
        // spawn_egg名称
        lines.push(`item.spawn_egg.entity.${entityId}.name=${displayName}`);
    }

    // 写入文件
    writeText(targetPath, lines.join('\n'));
    console.log(`语言文件已生成: ${targetPath}`);
}

/**
 * 主函数
 */
export async function main(): Promise<void> {
    generateItemTextureList();
    setupItemTextureJson();
    setupTerrainTextureJson();
    deployItemTexture();
    deploySpawnEggTextureNamespace();
    setupSoundsDefinition();
    generateLangFile();
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}