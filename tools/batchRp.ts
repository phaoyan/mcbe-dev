import * as path from 'path';
import {
    RESOURCE_PACK_DIR,
    writeJson,
    ensureDir
} from './utils';
import { rpEffect } from './batchrp/rp_effect';

// 导出数据函数
const exportData = (data: any, name: string): void => {
    const type = data["minecraft:client_entity"] ? "ce" : "att";
    const filename = `${name}.${type}.json`;

    const targetPath = type === "ce"
        ? path.join(RESOURCE_PACK_DIR, "entity", filename)
        : path.join(RESOURCE_PACK_DIR, "attachables", "items", filename);

    ensureDir(path.dirname(targetPath));
    writeJson(targetPath, data);
};


// 读取bbmodel配置
/**
 * 主函数
 */
export async function main(): Promise<void> {
    exportData(rpEffect("breathing_skill_dragon_head"),"effect/breathing_skill_dragon_head")
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}