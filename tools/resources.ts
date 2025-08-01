import * as path from 'path';
import {
    BEHAVIOR_PACK_DIR,
    RESOURCE_PACK_DIR,
    SCRIPTS_DIR,
    TOOLS_DIR,
    JSON_INDENT,
    rglob,
    readJson,
    writeJson,
    writeText,
    ensureDir
} from './utils';

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
    const itemTexturesDir = path.join(RESOURCE_PACK_DIR, "textures", "items");

    if (!fs.existsSync(itemTexturePath)) {
        console.warn(`物品纹理配置文件不存在: ${itemTexturePath}`);
        return;
    }

    const itemTextureJson = readJson(itemTexturePath);
    if (!itemTextureJson.texture_data) {
        itemTextureJson.texture_data = {};
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

            if (itemTextureNames.has(itemId)) {
                itemTextureJson.texture_data[itemId] = {
                    textures: `textures/items/${itemId}`
                };
            } else {
                itemTextureJson.texture_data[itemId] = {
                    textures: "textures/items/book"
                };
            }
        } catch (error) {
            console.error(`处理物品文件失败 ${itemFile}: ${error}`);
        }
    }

    writeJson(itemTexturePath, itemTextureJson);
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
                data["minecraft:item"].components["minecraft:icon"] = itemId;
                writeJson(itemFile, data);
            }
        } catch (error) {
            console.error(`部署物品纹理失败 ${itemFile}: ${error}`);
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
            const soundPath = `sounds/${relativePath.replace(/\\/g, '/')}`;

            // 生成声音ID（将路径中的/和\替换为.）
            const soundId = relativePath.replace(/[/\\]/g, '.').replace(/\.ogg$/, '');

            defJson.sound_definitions[soundId] = {
                category: "player",
                sounds: [{
                    name: soundPath,
                    volume: 1.0
                }]
            };
        } catch (error) {
            console.error(`处理声音文件失败 ${soundFile}: ${error}`);
        }
    }

    writeJson(defPath, defJson);
}

/**
 * 主函数
 */
export async function main(): Promise<void> {
    generateItemTextureList();
    setupItemTextureJson();
    deployItemTexture();
    setupSoundsDefinition();
}

// 添加fs导入
import * as fs from 'fs';

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}