import * as fs from 'fs';
import * as path from 'path';

/**
 * 获取项目名称
 */
export function getProjectName(): string {
    const envPath = path.join(__dirname, '..', '.env');
    const defaultProjectName = 'minecraft_dev';

    try {
        if (!fs.existsSync(envPath)) {
            return defaultProjectName;
        }

        const envContent = fs.readFileSync(envPath, 'utf-8');
        const firstLine = envContent.split('\n')[0] ?? '';
        const parts = firstLine.split('=');
        if (parts.length < 2) {
            return defaultProjectName;
        }
        const value = parts.slice(1).join('=').replace(/"/g, '').trim();
        return value || defaultProjectName;
    } catch {
        return defaultProjectName;
    }
}

// 路径常量定义
export const PROJECT_NAME = getProjectName();
export const TOOLS_DIR = __dirname;
export const PROJECT_ROOT = path.join(__dirname, '..');
export const BBPACK_DIR = "D:/coding/projects/minecraft-dev/project/mcbe-dev/tools/bbpacks";
export const BBMODEL_JSON_PATH = path.join(BBPACK_DIR, 'bbmodel.json');
export const ENV_PATH = path.join(PROJECT_ROOT, '.env');
export const RESOURCE_PACK_DIR = path.join(PROJECT_ROOT, 'resource_packs', PROJECT_NAME);
export const BEHAVIOR_PACK_DIR = path.join(PROJECT_ROOT, 'behavior_packs', PROJECT_NAME);
export const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

// 常量定义
export const JSON_INDENT = 4;
export const NAME_SPACE = PROJECT_NAME;

export const client_entity = "minecraft:client_entity";
export const attachable = "minecraft:attachable";

export const BBMODEL_JSON = readJson(BBMODEL_JSON_PATH);

/**
 * 确保目录存在
 */
export function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * 递归获取目录下的所有文件
 */
export function glob(pattern: string, directory: string): string[] {
    const files: string[] = [];

    function walkDir(dir: string) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (stat.isFile() && item.match(pattern)) {
                files.push(fullPath);
            }
        }
    }

    walkDir(directory);
    return files;
}

/**
 * 递归搜索文件
 */
export function rglob(pattern: string, directory: string): string[] {
    // 直接使用传入的pattern作为正则表达式
    const regex = new RegExp(pattern);
    const files: string[] = [];

    function walkDir(dir: string) {
        try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                let stat;
                try {
                    stat = fs.statSync(fullPath);
                } catch (e) {
                    // 跳过无法访问的文件
                    continue;
                }

                if (stat.isDirectory()) {
                    walkDir(fullPath);
                } else if (stat.isFile() && regex.test(item)) {
                    files.push(fullPath);
                }
            }
        } catch (e) {
            // 跳过无法访问的目录
            console.warn(`无法访问目录: ${dir}`, e);
        }
    }

    if (fs.existsSync(directory)) {
        walkDir(directory);
    }
    return files;
}

/**
 * 写入JSON文件
 */
export function writeJson(filePath: string, data: any): void {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, JSON_INDENT), 'utf-8');
}

/**
 * 读取JSON文件
 */
export function readJson(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 写入文本文件
 */
export function writeText(filePath: string, content: string): void {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 读取文本文件
 */
export function readText(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
}