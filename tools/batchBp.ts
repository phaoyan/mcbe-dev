import * as path from 'path';
import {
    NAME_SPACE,
    BEHAVIOR_PACK_DIR,
    writeJson,
    ensureDir
} from './utils';
import { bpEffect } from './batchbp/bp_effect';

// 导出数据函数
const exportData = (data: any, name: string): void => {
    const type = data["minecraft:entity"] ? "se" : "item";
    const filename = `${name}.${type}.json`;

    const targetPath = type === "se"
        ? path.join(BEHAVIOR_PACK_DIR, "entities", filename)
        : path.join(BEHAVIOR_PACK_DIR, "items", filename);

    ensureDir(path.dirname(targetPath));
    writeJson(targetPath, data);
};

/**
 * 主函数
 */
export async function main(): Promise<void> {

}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}