import * as fs from 'fs';
import * as path from 'path';
import {
    BBPACK_DIR,
    RESOURCE_PACK_DIR,
    rglob,
    readJson,
    writeJson,
    ensureDir,
    NAME_SPACE,
    TOOLS_DIR
} from './utils';

// 动画名称前缀
const ANIMATION_PREFIX = `animation.${NAME_SPACE}.`;

// ==================== 缓存系统 ====================
interface FileCache {
    bbmodelFiles: string[];               // bbmodels 目录下的直系 bbmodel 文件
    particleFiles: string[];              // particles 目录下的粒子文件
    allParticleFiles: string[];           // 所有粒子文件（包括 resource_packs）
}

interface DataCache {
    jsonData: Map<string, any>;           // filePath -> parsed JSON
    pngDimensions: Map<string, { width: number; height: number }>;
}

const fileCache: FileCache = {
    bbmodelFiles: [],
    particleFiles: [],
    allParticleFiles: []
};

const dataCache: DataCache = {
    jsonData: new Map(),
    pngDimensions: new Map()
};

// 将日志输出到 @outputs/bbpack.log（仅在本模块处理期间生效）
const OUTPUTS_DIR = path.join(TOOLS_DIR, 'outputs');
const BBPACK_LOG = path.join(OUTPUTS_DIR, 'bbpack.log');
let __logStream: fs.WriteStream | null = null;

const __origConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
};

function formatLogLine(level: string, args: any[]): string {
    const ts = new Date().toISOString();
    const text = args.map((a) => {
        try {
            if (typeof a === 'string') return a;
            return JSON.stringify(a);
        } catch {
            return String(a);
        }
    }).join(' ');
    return `[${ts}] [${level}] ${text}\n`;
}

function __setupLogger() {
    try {
        ensureDir(OUTPUTS_DIR);
        __logStream = fs.createWriteStream(BBPACK_LOG, { flags: 'w' });
        __logStream.write(`==== bbpack log started ${new Date().toISOString()} ====\n`);
        console.log = (...args: any[]) => { try { __logStream?.write(formatLogLine('INFO', args)); } catch { } };
        console.warn = (...args: any[]) => { try { __logStream?.write(formatLogLine('WARN', args)); } catch { } };
        console.error = (...args: any[]) => { try { __logStream?.write(formatLogLine('ERROR', args)); } catch { } };
    } catch { }
}

function __restoreConsole() {
    console.log = __origConsole.log;
    console.warn = __origConsole.warn;
    console.error = __origConsole.error;
}

function __closeLogger() {
    try { __logStream?.end(); } catch { } finally { __logStream = null; }
}

// 轻量级性能分析器（毫秒级）
const __prof = (() => {
    const stats = new Map<string, { timeMs: number; count: number }>();

    return {
        start(): number {
            return Date.now();
        },

        end(label: string, t0: number) {
            const dt = Date.now() - t0;
            const prev = stats.get(label) ?? { timeMs: 0, count: 0 };
            prev.timeMs += dt;
            prev.count += 1;
            stats.set(label, prev);
        },

        report(max: number = 30) {
            const arr = Array.from(stats.entries()).sort((a, b) => b[1].timeMs - a[1].timeMs);
            console.log(`--- profiling summary (top ${max}) ---`);
            for (const [k, v] of arr.slice(0, max)) {
                console.log(`${k}: ${v.timeMs.toFixed(2)} ms (x${v.count})`);
            }
        }
    };
})();

// ==================== 缓存辅助函数 ====================
/**
 * 一次性扫描所有文件并缓存
 */
async function buildFileCache(): Promise<void> {
    const t0 = __prof.start();
    console.log('🔍 开始构建文件缓存...');

    // 清空缓存
    fileCache.bbmodelFiles = [];
    fileCache.particleFiles = [];
    fileCache.allParticleFiles = [];

    if (!fs.existsSync(BBPACK_DIR)) {
        __prof.end('buildFileCache_total', t0);
        return;
    }

    // 扫描 bbpack/bbmodels 目录下的直系 bbmodel 文件
    const bbmodelsDir = path.join(BBPACK_DIR, 'bbmodels');
    if (fs.existsSync(bbmodelsDir)) {
        const dirents = fs.readdirSync(bbmodelsDir, { withFileTypes: true });
        fileCache.bbmodelFiles = dirents
            .filter(d => d.isFile() && d.name.endsWith('.bbmodel'))
            .map(d => path.join(bbmodelsDir, d.name));
        console.log(`  📄 发现 ${fileCache.bbmodelFiles.length} 个 bbmodel 文件`);
    }

    // 扫描 particles 目录下的粒子文件
    const particlesDir = path.join(BBPACK_DIR, 'particles');
    if (fs.existsSync(particlesDir)) {
        fileCache.particleFiles = rglob('.*\\.particle\\.json$', particlesDir);
        fileCache.allParticleFiles.push(...fileCache.particleFiles);
        console.log(`  📄 发现 ${fileCache.particleFiles.length} 个 particles 目录中的 particle 文件`);
    }

    // 扫描 resource_packs 中的粒子文件（用于其他功能）
    const resourceParticlesDir = path.join(RESOURCE_PACK_DIR, 'particles');
    if (fs.existsSync(resourceParticlesDir)) {
        const resourceParticles = rglob('.*\\.particle\\.json$', resourceParticlesDir);
        fileCache.allParticleFiles.push(...resourceParticles);
    }

    __prof.end('buildFileCache_total', t0);
    console.log(`✅ 文件缓存构建完成: ${fileCache.bbmodelFiles.length} 个 bbmodel 文件, ${fileCache.allParticleFiles.length} 个粒子文件`);
}

/**
 * 带缓存的读取 JSON 文件
 */
async function readJsonCached(filePath: string): Promise<any> {
    if (dataCache.jsonData.has(filePath)) {
        return dataCache.jsonData.get(filePath);
    }

    const data = readJson(filePath);
    dataCache.jsonData.set(filePath, data);
    return data;
}

/**
 * 写入 JSON 并更新缓存
 */
async function writeJsonCached(filePath: string, data: any): Promise<void> {
    writeJson(filePath, data);
    dataCache.jsonData.set(filePath, data);
}

/**
 * 带缓存的读取 PNG 尺寸
 */
async function readPngDimensionsCached(filePath: string): Promise<{ width: number; height: number } | null> {
    if (dataCache.pngDimensions.has(filePath)) {
        return dataCache.pngDimensions.get(filePath)!;
    }

    const size = readPngDimensions(filePath);
    if (size) {
        dataCache.pngDimensions.set(filePath, size);
    }
    return size;
}

/**
 * 清空数据缓存
 */
function clearDataCache(): void {
    dataCache.jsonData.clear();
    dataCache.pngDimensions.clear();
    console.log('🧹 数据缓存已清空');
}

interface MissingReference {
    directory: string;
    bbmodelFile: string;
    missingId: string;
}

interface BbmodelParticleReferences {
    bbmodelFile: string;
    bbmodelPath: string;
    location: string;
    animations: AnimationParticleReference[];
}

/**
 * 检查粒子引用关系（异步优化版本）
 */
export async function checkParticleReferences(): Promise<void> {
    const t0 = __prof.start();
    console.log("开始检查bbmodel与particle.json文件的引用关系...");
    console.log("=".repeat(60));

    let totalMissing = 0;
    const missingReferences: MissingReference[] = [];
    const allReferences: BbmodelParticleReferences[] = [];

    // 获取 particles 目录中的所有粒子文件
    const particleFiles = fileCache.particleFiles;
    if (particleFiles.length === 0) {
        console.log("⚠️  particles 目录中没有粒子文件");
    }

    // 获取所有可用的粒子 ID
    const availableParticleIds = await getParticleIdsAsync(particleFiles);
    console.log(`  📦 particles 目录中有 ${availableParticleIds.size} 个可用粒子ID`);

    // 构建粒子ID到文件路径的映射
    const particleIdToFileMap = await getParticleIdMapAsync(particleFiles);

    const bbmodelFiles = fileCache.bbmodelFiles;
    if (bbmodelFiles.length === 0) {
        console.log("⚠️  bbmodels 目录中没有 bbmodel 文件");
        __prof.end('checkParticleReferences_total', t0);
        return;
    }

    // 并行检查所有 bbmodel 文件
    const results = await Promise.all(bbmodelFiles.map(async (bbmodelFile) => {
        return await checkSingleBbmodelAsync(bbmodelFile, availableParticleIds, particleIdToFileMap);
    }));

    // 汇总结果
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const bbmodelFile = bbmodelFiles[i];

        if (result.missingIds.length > 0) {
            console.log(`    ❌ 检查bbmodel: ${path.basename(bbmodelFile)} 找到 ${result.missingIds.length} 个缺失的粒子引用`);
            result.missingIds.forEach(missingId => {
                missingReferences.push({
                    directory: 'bbmodels',
                    bbmodelFile: path.basename(bbmodelFile),
                    missingId
                });
            });
            totalMissing += result.missingIds.length;
        }

        // 收集引用关系（只记录有粒子引用的 bbmodel）
        if (result.references.length > 0) {
            allReferences.push({
                bbmodelFile: path.basename(bbmodelFile),
                bbmodelPath: path.relative(BBPACK_DIR, bbmodelFile).replace(/\\/g, '/'),
                location: 'bbmodels',
                animations: result.references
            });
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("检查完成！");
    console.log(`总共检查了 ${bbmodelFiles.length} 个 bbmodel 文件`);
    console.log(`总共发现 ${totalMissing} 个缺失的粒子引用`);
    __prof.end('checkParticleReferences_total', t0);

    if (missingReferences.length > 0) {
        console.log("\n" + "=".repeat(60));
        console.log("缺失的粒子引用详细列表：");
        console.log("=".repeat(60));

        for (const ref of missingReferences) {
            console.log(`  🔸 文件: ${ref.bbmodelFile}`);
            console.log(`    ❌ 缺失ID: ${ref.missingId}`);
        }
    } else {
        console.log("\n🎉 所有bbmodel文件的粒子引用都正常！");
    }

    // 输出引用关系到 JSON 文件
    const outputFile = path.join(OUTPUTS_DIR, 'bbpack_particle_references.json');
    ensureDir(OUTPUTS_DIR);

    // 构建缺失粒子的详细信息
    const missingDetails = missingReferences.map(ref => ({
        directory: ref.directory,
        bbmodelFile: ref.bbmodelFile,
        missingParticleId: ref.missingId
    }));

    // 获取所有唯一的缺失粒子ID
    const uniqueMissingIds = Array.from(new Set(missingReferences.map(ref => ref.missingId))).sort();

    const outputData = {
        generatedAt: new Date().toISOString(),
        totalBbmodels: allReferences.length,
        totalAnimations: allReferences.reduce((sum, ref) => sum + ref.animations.length, 0),
        availableParticles: Array.from(availableParticleIds).sort(),
        missing: {
            total: totalMissing,
            uniqueParticleIds: uniqueMissingIds,
            details: missingDetails
        },
        references: allReferences
    };
    writeJson(outputFile, outputData);
    console.log(`\n📄 粒子引用关系已输出到: ${path.relative(process.cwd(), outputFile)}`);
}

/**
 * 检查并修复bbpack中粒子文件的命名空间（异步优化版本）
 */
export async function checkParticleIds(): Promise<void> {
    const t0 = __prof.start();
    console.log("开始检查并修复 particles 目录中的粒子ID命名空间...");
    console.log("=".repeat(60));

    // 获取 particles 目录中的所有粒子文件
    const particleFiles = fileCache.particleFiles;

    if (particleFiles.length === 0) {
        console.log("⚠️  particles 目录中没有粒子文件");
        __prof.end('checkParticleIds_total', t0);
        return;
    }

    let totalFixed = 0;

    // 并行处理所有粒子文件
    await Promise.all(particleFiles.map(async (particleFile) => {
        try {
            const data = await readJsonCached(particleFile);
            const description = data?.particle_effect?.description;
            const identifier: string | undefined = description?.identifier;

            if (!identifier || typeof identifier !== 'string') {
                console.log(`  ⚠️  跳过无identifier的文件: ${path.basename(particleFile)}`);
                return;
            }

            const hasNamespace = identifier.includes(':');
            const [currentNamespace, idWithoutNs] = hasNamespace
                ? ((): [string, string] => {
                    const idx = identifier.indexOf(':');
                    return [identifier.substring(0, idx), identifier.substring(idx + 1)];
                })()
                : ['', identifier];

            if (!idWithoutNs) {
                console.log(`  ⚠️  非法的identifier，跳过: ${identifier}`);
                return;
            }

            if (currentNamespace !== NAME_SPACE) {
                const newIdentifier = `${NAME_SPACE}:${idWithoutNs}`;
                data.particle_effect.description.identifier = newIdentifier;
                await writeJsonCached(particleFile, data);
                totalFixed++;
                console.log(`  ✅ 修复: ${path.basename(particleFile)}  ${identifier} -> ${newIdentifier}`);
            }
        } catch (error) {
            console.log(`  ❌ 处理文件 ${path.basename(particleFile)} 时出错: ${error}`);
        }
    }));

    console.log("\n" + "=".repeat(60));
    console.log("检查完成！");
    console.log(`共处理 ${particleFiles.length} 个particle文件`);
    __prof.end('checkParticleIds_total', t0);
    if (totalFixed > 0) {
        console.log(`✅ 已修复 ${totalFixed} 个粒子ID命名空间`);
    } else {
        console.log("✅ 所有粒子ID命名空间均已正确");
    }
}

/**
 * 修正单个粒子文件的 flipbook UV（核心逻辑）
 */
async function fixSingleFlipbookUV(particleFile: string): Promise<{
    updated: boolean;
    skipped: boolean;
    error?: boolean;
    fileName: string;
    oldSize?: string;
    newSize?: string;
    warning?: string;
}> {
    const fileName = path.basename(particleFile);
    try {
        const data: any = await readJsonCached(particleFile);
        const pe = data?.particle_effect;
        const desc = pe?.description;
        const comps = pe?.components;
        const billboard = comps?.["minecraft:particle_appearance_billboard"];
        const uv = billboard?.uv;
        const flipbook = uv?.flipbook;

        if (!billboard || !uv || !flipbook) {
            return { updated: false, skipped: true, fileName };
        }

        const textureRef = desc?.basic_render_parameters?.texture;
        if (typeof textureRef !== 'string' || textureRef.length === 0) {
            return { updated: false, skipped: true, fileName, warning: '无有效纹理引用' };
        }

        const texturePath = resolveTexturePath(textureRef);
        if (!texturePath) {
            return { updated: false, skipped: true, fileName, warning: `找不到纹理: ${textureRef}` };
        }

        const size = await readPngDimensionsCached(texturePath);
        if (!size) {
            return { updated: false, skipped: true, fileName, warning: `无法读取纹理尺寸` };
        }

        const realW = size.width;
        const realH = size.height;

        const oldW = Number(uv.texture_width);
        const oldH = Number(uv.texture_height);

        const hasOldW = Number.isFinite(oldW) && oldW > 0;
        const hasOldH = Number.isFinite(oldH) && oldH > 0;

        const sx = hasOldW ? realW / oldW : 1;
        const sy = hasOldH ? realH / oldH : 1;

        let changed = false;

        if (uv.texture_width !== realW) {
            uv.texture_width = realW;
            changed = true;
        }
        if (uv.texture_height !== realH) {
            uv.texture_height = realH;
            changed = true;
        }

        const scaleVec2 = (v: any) => {
            if (!Array.isArray(v) || v.length < 2) return false;
            const nx = Number(v[0]);
            const ny = Number(v[1]);
            if (!Number.isFinite(nx) || !Number.isFinite(ny)) return false;
            const rx = nx * sx;
            const ry = ny * sy;
            if (rx !== nx || ry !== ny) {
                v[0] = rx;
                v[1] = ry;
                return true;
            }
            return false;
        };

        const changedBase = scaleVec2(flipbook.base_UV);
        const changedSize = scaleVec2(flipbook.size_UV);
        const changedStep = scaleVec2(flipbook.step_UV);
        if (changedBase || changedSize || changedStep) changed = true;

        if (changed) {
            await writeJsonCached(particleFile, data);
            return {
                updated: true,
                skipped: false,
                fileName,
                oldSize: `${oldW}x${oldH}`,
                newSize: `${realW}x${realH}`
            };
        } else {
            return { updated: false, skipped: true, fileName };
        }
    } catch (err) {
        console.log(`  ❌ 处理失败 ${fileName}: ${err}`);
        return { updated: false, skipped: false, error: true, fileName };
    }
}

/**
 * 修正指定目录中使用 flipbook 的粒子文件的 uv 与纹理尺寸
 */
async function fixFlipbookUVsInDir(particleFiles: string[], dirName: string): Promise<{ processed: number; updated: number; skipped: number }> {
    if (particleFiles.length === 0) {
        return { processed: 0, updated: 0, skipped: 0 };
    }

    let updated = 0;
    let skipped = 0;

    // 并行处理所有粒子文件
    const results = await Promise.all(
        particleFiles.map(async (particleFile) => {
            return await fixSingleFlipbookUV(particleFile);
        })
    );

    const updatedFiles: Array<{ fileName: string; oldSize: string; newSize: string }> = [];
    const warnings: Array<{ fileName: string; warning: string }> = [];

    // 统计结果
    for (const result of results) {
        if (result.updated) {
            updated++;
            if (result.oldSize && result.newSize) {
                updatedFiles.push({
                    fileName: result.fileName,
                    oldSize: result.oldSize,
                    newSize: result.newSize
                });
            }
        }
        if (result.skipped) {
            skipped++;
        }
        if (result.warning) {
            warnings.push({ fileName: result.fileName, warning: result.warning });
        }
    }

    // 只在有更新或警告时输出
    if (updated > 0 || warnings.length > 0) {
        console.log(`  ${dirName}: 扫描 ${particleFiles.length} 个文件`);

        if (updated > 0) {
            console.log(`  ✅ 修正了 ${updated} 个文件`);
            for (const item of updatedFiles) {
                console.log(`    - ${item.fileName}: ${item.oldSize} -> ${item.newSize}`);
            }
        }

        if (warnings.length > 0) {
            console.log(`  ⚠️ ${warnings.length} 个文件有警告`);
            for (const item of warnings) {
                console.log(`    - ${item.fileName}: ${item.warning}`);
            }
        }
    }

    return { processed: particleFiles.length, updated, skipped };
}

/**
 * 修正使用 flipbook 的粒子文件的 uv 与纹理尺寸
 * 包括 particles 目录和 resource_packs/particles 目录
 */
export async function fixFlipbookUVs(): Promise<void> {
    const t0 = __prof.start();
    console.log('开始修正使用 flipbook 的粒子 UV...');

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    // 1. 修正 particles 目录中的粒子文件
    const particleFiles = fileCache.particleFiles;
    if (particleFiles.length > 0) {
        const result = await fixFlipbookUVsInDir(particleFiles, 'particles');
        totalProcessed += result.processed;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;
    }

    // 2. 修正 resource_packs/particles 目录中的粒子文件
    const particlesDir = path.join(RESOURCE_PACK_DIR, 'particles');
    if (fs.existsSync(particlesDir)) {
        const resourceParticleFiles = rglob('.*\\.particle\\.json$', particlesDir);
        const result = await fixFlipbookUVsInDir(resourceParticleFiles, 'resource_packs/particles');
        totalProcessed += result.processed;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;
    }

    if (totalUpdated > 0) {
        console.log(`✅ 扫描 ${totalProcessed} 个文件，修正了 ${totalUpdated} 个`);
    } else {
        console.log(`  ✅ 所有 flipbook UV 配置正确`);
    }
    __prof.end('fixFlipbookUVs_total', t0);
}

/** 解析纹理引用为实际 PNG 路径 */
function resolveTexturePath(textureRef: string): string | null {
    let name = textureRef.trim();
    const colon = name.indexOf(':');
    if (colon >= 0) name = name.substring(colon + 1);

    const ensurePng = (p: string) => (p.endsWith('.png') ? p : `${p}.png`);

    const candidates: string[] = [];
    const [teamName, projName] = NAME_SPACE.split('_', 2);
    const nsPrefix = `textures/${teamName}/${projName}/`;
    // 已经带有 textures/ 前缀
    if (name.startsWith('textures/')) {
        candidates.push(path.join(RESOURCE_PACK_DIR, ensurePng(name)));
        // 尝试在 textures/ 后插入 团队/项目 前缀
        if (!name.startsWith(nsPrefix)) {
            candidates.push(path.join(
                RESOURCE_PACK_DIR,
                ensurePng(name.replace(/^textures\//, nsPrefix))
            ));
        }
    }
    // 直接拼 textures/<name>
    candidates.push(path.join(RESOURCE_PACK_DIR, 'textures', ensurePng(name)));
    // 直接拼 textures/<团队>/<项目>/<name>
    candidates.push(path.join(RESOURCE_PACK_DIR, ensurePng(path.join('textures', teamName, projName, name))));
    // 偏向粒子材质目录
    candidates.push(path.join(RESOURCE_PACK_DIR, 'textures', 'particle', ensurePng(name)));

    // 如果 name 本身是诸如 'particle/foo' 或 'entity/bar'
    candidates.push(path.join(RESOURCE_PACK_DIR, 'textures', ensurePng(path.join(name))));

    for (const p of dedupe(candidates)) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function dedupe(list: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of list) {
        if (!seen.has(item)) {
            seen.add(item);
            out.push(item);
        }
    }
    return out;
}

/**
 * 修复单个粒子文件的纹理引用路径（核心逻辑）
 */
function fixSingleParticleTexturePath(
    file: string,
    teamName: string,
    projName: string,
    insertPrefix: string
): { updated: boolean; fileName: string; oldRef?: string; newRef?: string; missingTexture?: { particleFile: string; textureRefInFile: string; expectedPath: string } } {
    try {
        const data: any = readJson(file);
        const desc = data?.particle_effect?.description;
        const brp = desc?.basic_render_parameters;
        const textureRef: unknown = brp?.texture;
        const fileName = path.basename(file);

        if (typeof textureRef !== 'string' || textureRef.length === 0) {
            return { updated: false, fileName };
        }

        let ns = '';
        let pathPart = textureRef.trim();
        const colon = pathPart.indexOf(':');
        if (colon >= 0) {
            ns = pathPart.substring(0, colon);
            pathPart = pathPart.substring(colon + 1);
        }

        // 仅修复：无命名空间 或 命名空间为当前 NAME_SPACE 的路径
        if (ns && ns !== NAME_SPACE) {
            return { updated: false, fileName };
        }

        let newPathPart: string;
        let effectivePathPart: string;

        // 如果路径中没有斜杠，说明只是一个文件名，直接拼接到 particle 目录
        if (!pathPart.includes('/')) {
            const texFileName = pathPart.replace(/\.png$/i, '');
            newPathPart = `textures/${teamName}/${projName}/particle/${texFileName}`;
            effectivePathPart = newPathPart;

            const newTextureRef = ns ? `${ns}:${newPathPart}` : newPathPart;
            if (newTextureRef !== textureRef) {
                data.particle_effect.description.basic_render_parameters.texture = newTextureRef;
                writeJson(file, data);

                // 检查 particle 目录是否有对应贴图
                const expectedParticlePng = path.join(RESOURCE_PACK_DIR, 'textures', teamName, projName, 'particle', `${texFileName}.png`);
                if (!fs.existsSync(expectedParticlePng)) {
                    return {
                        updated: true,
                        fileName,
                        oldRef: textureRef,
                        newRef: newTextureRef,
                        missingTexture: {
                            particleFile: fileName,
                            textureRefInFile: newTextureRef,
                            expectedPath: path.relative(RESOURCE_PACK_DIR, expectedParticlePng).replace(/\\\\/g, '/')
                        }
                    };
                }
                return { updated: true, fileName, oldRef: textureRef, newRef: newTextureRef };
            }

            // 检查贴图存在性（即使没有修改路径）
            const expectedParticlePng = path.join(RESOURCE_PACK_DIR, 'textures', teamName, projName, 'particle', `${texFileName}.png`);
            if (!fs.existsSync(expectedParticlePng)) {
                return {
                    updated: false,
                    fileName,
                    missingTexture: {
                        particleFile: fileName,
                        textureRefInFile: newTextureRef,
                        expectedPath: path.relative(RESOURCE_PACK_DIR, expectedParticlePng).replace(/\\\\/g, '/')
                    }
                };
            }
            return { updated: false, fileName };
        }

        // 如果不是以 textures/ 开头，跳过
        if (!pathPart.startsWith('textures/')) {
            return { updated: false, fileName };
        }

        // 已包含团队/项目则跳过路径替换，但仍检查贴图存在性
        if (pathPart.startsWith(insertPrefix)) {
            effectivePathPart = pathPart;
            const baseName = path.basename(effectivePathPart).replace(/\.png$/i, '');
            const expectedParticlePng = path.join(RESOURCE_PACK_DIR, 'textures', teamName, projName, 'particle', `${baseName}.png`);
            if (!fs.existsSync(expectedParticlePng)) {
                return {
                    updated: false,
                    fileName,
                    missingTexture: {
                        particleFile: fileName,
                        textureRefInFile: textureRef,
                        expectedPath: path.relative(RESOURCE_PACK_DIR, expectedParticlePng).replace(/\\\\/g, '/')
                    }
                };
            }
            return { updated: false, fileName };
        }

        newPathPart = pathPart.replace(/^textures\//, insertPrefix);
        const newTextureRef = ns ? `${ns}:${newPathPart}` : newPathPart;

        if (newTextureRef !== textureRef) {
            data.particle_effect.description.basic_render_parameters.texture = newTextureRef;
            writeJson(file, data);

            // 检查 particle 目录是否有对应贴图
            effectivePathPart = newPathPart;
            const baseName = path.basename(effectivePathPart).replace(/\.png$/i, '');
            const expectedParticlePng = path.join(RESOURCE_PACK_DIR, 'textures', teamName, projName, 'particle', `${baseName}.png`);
            if (!fs.existsSync(expectedParticlePng)) {
                return {
                    updated: true,
                    fileName,
                    oldRef: textureRef,
                    newRef: newTextureRef,
                    missingTexture: {
                        particleFile: fileName,
                        textureRefInFile: ns ? `${ns}:${effectivePathPart}` : effectivePathPart,
                        expectedPath: path.relative(RESOURCE_PACK_DIR, expectedParticlePng).replace(/\\\\/g, '/')
                    }
                };
            }
            return { updated: true, fileName, oldRef: textureRef, newRef: newTextureRef };
        }

        // 检查贴图存在性（即使没有修改路径）
        effectivePathPart = newPathPart;
        const baseName = path.basename(effectivePathPart).replace(/\.png$/i, '');
        const expectedParticlePng = path.join(RESOURCE_PACK_DIR, 'textures', teamName, projName, 'particle', `${baseName}.png`);
        if (!fs.existsSync(expectedParticlePng)) {
            return {
                updated: false,
                fileName,
                missingTexture: {
                    particleFile: fileName,
                    textureRefInFile: ns ? `${ns}:${effectivePathPart}` : effectivePathPart,
                    expectedPath: path.relative(RESOURCE_PACK_DIR, expectedParticlePng).replace(/\\\\/g, '/')
                }
            };
        }
        return { updated: false, fileName };
    } catch (err) {
        console.log(`  ❌ 修复纹理失败 ${path.basename(file)}: ${err}`);
        return { updated: false, fileName: path.basename(file) };
    }
}

/**
 * 修复粒子文件纹理引用路径（通用版本）
 */
function fixParticleTexturePathsInDir(dirPath: string, dirName: string): void {
    if (!fs.existsSync(dirPath)) {
        return;
    }

    const [teamName, projName] = NAME_SPACE.split('_', 2);
    const insertPrefix = `textures/${teamName}/${projName}/`;

    const files = rglob('.*\\.particle\\.json$', dirPath);
    let updated = 0;
    const missingTextureReports: { particleFile: string; textureRefInFile: string; expectedPath: string }[] = [];
    const updatedFiles: Array<{ fileName: string; oldRef: string; newRef: string }> = [];

    for (const file of files) {
        const result = fixSingleParticleTexturePath(file, teamName, projName, insertPrefix);
        if (result.updated) {
            updated++;
            if (result.oldRef && result.newRef) {
                updatedFiles.push({ fileName: result.fileName, oldRef: result.oldRef, newRef: result.newRef });
            }
        }
        if (result.missingTexture) {
            missingTextureReports.push(result.missingTexture);
        }
    }

    // 只在有更新或有问题时输出
    if (updated > 0 || missingTextureReports.length > 0) {
        console.log(`  ${dirName}: 扫描 ${files.length} 个文件`);

        if (updated > 0) {
            console.log(`  ✅ 更新了 ${updated} 个纹理引用`);
            for (const item of updatedFiles) {
                console.log(`    - ${item.fileName}: ${item.oldRef} -> ${item.newRef}`);
            }
        }

        if (missingTextureReports.length > 0) {
            console.log(`  ⚠️ 发现 ${missingTextureReports.length} 个缺失的粒子贴图`);
            for (const item of missingTextureReports) {
                console.log(`    - ${item.particleFile}: ${item.textureRefInFile}`);
            }
        }
    }
}

/**
 * 修复所有粒子文件的纹理引用路径
 * 包括 particles 目录和 resource_packs/particles 目录
 */
function fixParticleTexturePaths(): void {
    console.log('开始修复粒子文件纹理引用路径...');

    let hasOutput = false;

    // 1. 修复 particles 目录中的粒子文件
    const particlesDir = path.join(BBPACK_DIR, 'particles');
    if (fs.existsSync(particlesDir)) {
        fixParticleTexturePathsInDir(particlesDir, 'particles');
        hasOutput = true;
    }

    // 2. 修复 resource_packs/particles 目录中的粒子文件
    const resourceParticlesDir = path.join(RESOURCE_PACK_DIR, 'particles');
    if (fs.existsSync(resourceParticlesDir)) {
        fixParticleTexturePathsInDir(resourceParticlesDir, 'resource_packs/particles');
        hasOutput = true;
    }

    if (!hasOutput) {
        console.log('  ✅ 所有纹理路径正确');
    }
}

/**
 * 读取 PNG 尺寸（无需额外依赖）
 * 依据 PNG 规范：宽高位于偏移 16/20 的 4 字节大端整数
 */
function readPngDimensions(filePath: string): { width: number; height: number } | null {
    try {
        const fd = fs.openSync(filePath, 'r');
        try {
            const buf = Buffer.alloc(24);
            const bytes = fs.readSync(fd, buf, 0, 24, 0);
            if (bytes < 24) return null;
            // 可选：校验 PNG 签名
            if (
                buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47 ||
                buf[4] !== 0x0d || buf[5] !== 0x0a || buf[6] !== 0x1a || buf[7] !== 0x0a
            ) {
                return null;
            }
            const width = buf.readUInt32BE(16);
            const height = buf.readUInt32BE(20);
            if (width <= 0 || height <= 0) return null;
            return { width, height };
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return null;
    }
}

/**
 * 从particle文件列表中提取粒子ID（异步版本，带缓存）
 */
async function getParticleIdsAsync(particleFiles: string[]): Promise<Set<string>> {
    const particleIds = new Set<string>();

    await Promise.all(particleFiles.map(async (particleFile) => {
        try {
            const data = await readJsonCached(particleFile);
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
    }));

    return particleIds;
}

/**
 * 构建 粒子ID -> 文件路径 的映射（异步版本，带缓存）
 */
async function getParticleIdMapAsync(particleFiles: string[]): Promise<Record<string, string>> {
    const idToFile: Record<string, string> = {};

    await Promise.all(particleFiles.map(async (file) => {
        try {
            const data = await readJsonCached(file);
            const identifier = data.particle_effect?.description?.identifier || '';
            let particleId: string;
            if (identifier.includes(':')) {
                particleId = identifier.split(':')[1];
            } else {
                particleId = identifier;
            }
            if (particleId && !idToFile[particleId]) {
                idToFile[particleId] = file;
            }
        } catch { }
    }));

    return idToFile;
}

interface AnimationParticleReference {
    animationName: string;
    particles: string[];
    missingParticles: string[];
}

/**
 * 检查单个bbmodel文件中的粒子引用（异步版本，带缓存）
 * @returns { missingIds: 缺失的粒子ID列表, references: 动画粒子引用详情 }
 */
async function checkSingleBbmodelAsync(
    bbmodelFile: string,
    availableParticleIds: Set<string>,
    particleIdToFileMap?: Record<string, string>
): Promise<{ missingIds: string[]; references: AnimationParticleReference[] }> {
    const missingIds: string[] = [];
    const references: AnimationParticleReference[] = [];

    try {
        const data = await readJsonCached(bbmodelFile);
        const animations = data.animations || [];

        if (animations.length === 0) {
            console.log(`    信息：${path.basename(bbmodelFile)} 没有animations，这是正常的`);
            return { missingIds, references };
        }

        let fileModified = false;

        for (const animation of animations) {
            if (!animation || typeof animation !== 'object') {
                continue;
            }

            const animationName = animation.name || '(未命名动画)';
            const particlesInAnimation = new Set<string>();
            const missingInAnimation = new Set<string>();

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
                    if (effectId) {
                        particlesInAnimation.add(effectId);

                        if (!availableParticleIds.has(effectId)) {
                            missingInAnimation.add(effectId);
                            if (!missingIds.includes(effectId)) {
                                missingIds.push(effectId);
                            }
                        } else if (particleIdToFileMap && particleIdToFileMap[effectId]) {
                            // 粒子引用存在，添加绝对路径到 file 字段
                            const particleFilePath = particleIdToFileMap[effectId];

                            // 只在 file 字段不存在或不同时更新
                            if (dataPoint.file !== particleFilePath) {
                                dataPoint.file = particleFilePath;
                                fileModified = true;
                            }
                        }
                    }
                }
            }

            // 只记录有粒子引用的动画
            if (particlesInAnimation.size > 0) {
                references.push({
                    animationName,
                    particles: Array.from(particlesInAnimation).sort(),
                    missingParticles: Array.from(missingInAnimation).sort()
                });
            }
        }

        // 如果文件被修改，写回文件
        if (fileModified) {
            await writeJsonCached(bbmodelFile, data);
            console.log(`  ✅ 已更新粒子文件路径: ${path.basename(bbmodelFile)}`);
        }
    } catch (error) {
        console.log(`    错误：读取bbmodel文件 ${path.basename(bbmodelFile)} 时出错: ${error}`);
    }

    return { missingIds, references };
}

/**
 * 复制bbpack文件（异步版本，始终全量复制）
 */
export async function copyBbpackFiles(): Promise<void> {
    const t0 = __prof.start();

    const particlesTargetDir = path.join(RESOURCE_PACK_DIR, "particles");
    ensureDir(particlesTargetDir);

    console.log("开始复制 particles 目录中的 particle 文件（全量部署）...");
    console.log("=".repeat(60));

    // 1. 获取 particles 目录中的所有粒子文件
    const particleFiles = fileCache.particleFiles;

    if (particleFiles.length === 0) {
        console.log("⚠️  particles 目录中没有粒子文件");
        __prof.end('copyBbpackFiles_total', t0);
        return;
    }

    // 2. 构建源文件映射
    const sourceFiles = new Map<string, string>(); // basename -> fullPath
    for (const particleFile of particleFiles) {
        const basename = path.basename(particleFile);
        sourceFiles.set(basename, particleFile);
    }

    // 3. 收集目标文件夹中现有的 particle 文件（异步）
    const existingTargetFiles = new Set<string>();
    if (fs.existsSync(particlesTargetDir)) {
        const files = await fs.promises.readdir(particlesTargetDir);
        for (const file of files) {
            if (file.endsWith('.particle.json')) {
                existingTargetFiles.add(file);
            }
        }
    }

    // 4. 全量复制所有源文件（限制并发数避免文件句柄耗尽）
    const filesToProcess = Array.from(sourceFiles.entries());
    const BATCH_SIZE = 20;
    let copiedCount = 0;
    let updatedCount = 0;

    console.log("\n📁 处理particle文件...");

    const copyOperations: Array<{ type: string; file: string }> = [];

    const tCopy = __prof.start();
    for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
        const batch = filesToProcess.slice(i, i + BATCH_SIZE);
        await Promise.all(
            batch.map(async ([basename, sourcePath]) => {
                const targetPath = path.join(particlesTargetDir, basename);
                const isNew = !existingTargetFiles.has(basename);
                try {
                    await fs.promises.copyFile(sourcePath, targetPath);
                    if (isNew) {
                        copyOperations.push({ type: '新增', file: basename });
                        copiedCount++;
                    } else {
                        copyOperations.push({ type: '更新', file: basename });
                        updatedCount++;
                    }
                } catch (error) {
                    copyOperations.push({ type: '失败', file: basename });
                }
            })
        );
    }
    __prof.end('copyBbpack_copyFiles', tCopy);

    // 只打印有操作的文件
    if (copyOperations.length > 0) {
        for (const op of copyOperations) {
            const icon = op.type === '新增' ? '➕' : op.type === '更新' ? '🔄' : '❌';
            console.log(`  ${icon} ${op.type}: ${op.file}`);
        }
    }

    // 6. 并行删除过期文件
    const filesToDelete = Array.from(existingTargetFiles).filter(
        basename => !sourceFiles.has(basename)
    );

    let deletedCount = 0;
    const tDelete = __prof.start();

    if (filesToDelete.length > 0) {
        console.log("\n🧹 清理过期文件...");
        await Promise.all(
            filesToDelete.map(async (basename) => {
                const targetPath = path.join(particlesTargetDir, basename);
                try {
                    await fs.promises.unlink(targetPath);
                    console.log(`  🗑️  删除: ${basename}`);
                    deletedCount++;
                } catch (error) {
                    console.log(`  ⚠️  删除失败 ${basename}: ${error}`);
                }
            })
        );
    }
    __prof.end('copyBbpack_deleteFiles', tDelete);

    // 7. 输出统计信息
    console.log("\n" + "=".repeat(60));
    console.log("复制完成！");
    console.log(`📊 处理统计:`);
    console.log(`  ➕ 新增文件: ${copiedCount} 个`);
    console.log(`  🔄 更新文件: ${updatedCount} 个`);
    console.log(`  ⏭️  跳过文件: 0 个（全量复制）`);
    console.log(`  🗑️  删除文件: ${deletedCount} 个 (已过期)`);
    console.log(`  📁 总共: ${sourceFiles.size} 个源文件`);
    console.log(`目标路径: ${particlesTargetDir}`);
    console.log("ℹ️  bbmodel文件无需复制，处理程序将直接从bbpack文件夹读取");
    __prof.end('copyBbpackFiles_total', t0);
}

/**
 * 检查动画名称规范（异步优化版本）
 */
export async function checkAnimationIds(): Promise<void> {
    const t0 = __prof.start();

    let totalFiles = 0;
    let totalFixed = 0;

    console.log("开始检查bbmodel文件中的动画名称规范...");
    console.log("=".repeat(60));

    const bbmodelFiles = fileCache.bbmodelFiles;
    if (bbmodelFiles.length === 0) {
        console.log("⚠️  bbmodels 目录中没有 bbmodel 文件");
        __prof.end('checkAnimationIds_total', t0);
        return;
    }

    // 并行处理所有 bbmodel 文件
    const results = await Promise.all(bbmodelFiles.map(async (bbmodelFile) => {
        try {
            totalFiles++;
            const data = await readJsonCached(bbmodelFile);
            let fileModified = false;
            let fileFixed = 0;
            const bbmodelBaseName = path.basename(bbmodelFile, '.bbmodel');

            if (data.animations && Array.isArray(data.animations)) {
                for (let i = 0; i < data.animations.length; i++) {
                    const animation = data.animations[i];
                    if (animation && typeof animation === 'object' && animation.name) {
                        const name = animation.name;

                        if (!isValidAnimationName(name, bbmodelBaseName)) {
                            console.log(`\n❌ 发现不符合规范的动画名称：`);
                            console.log(`📁 文件: ${path.relative(BBPACK_DIR, bbmodelFile)}`);
                            console.log(`🎬 当前名称: ${name}`);
                            console.log("\n规范要求：");
                            console.log(`1. 必须以 'animation.${NAME_SPACE}.${bbmodelBaseName}.' 开头`);
                            console.log("2. 结构为 animation.命名空间.bbmodel名称.动画名称（至少包含上述四段）");
                            console.log("3. 仅能包含小写字母、下划线、数字和小数点");

                            const suggestedName = generateValidAnimationName(name, bbmodelBaseName);
                            data.animations[i].name = suggestedName;
                            fileModified = true;
                            fileFixed++;
                            console.log(`✅ 名称已自动修改: ${name} -> ${suggestedName}`);
                        }
                    }
                }
            }

            if (fileModified) {
                await writeJsonCached(bbmodelFile, data);
                console.log(`💾 文件已保存: ${path.relative(BBPACK_DIR, bbmodelFile)}`);
            }

            return fileFixed;
        } catch (error) {
            console.log(`读取文件 ${path.relative(BBPACK_DIR, bbmodelFile)} 时出错: ${error}`);
            return 0;
        }
    }));

    // 汇总结果
    totalFixed = results.reduce((sum, fixed) => sum + fixed, 0);

    console.log("\n" + "=".repeat(60));
    console.log("检查完成！");
    console.log(`总共检查了 ${totalFiles} 个 bbmodel 文件`);
    __prof.end('checkAnimationIds_total', t0);
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
function isValidAnimationName(name: string, bbmodelName: string): boolean {
    // 检查是否以动画前缀开头
    if (!name.startsWith(ANIMATION_PREFIX)) {
        return false;
    }

    // 检查是否仅包含小写字母、下划线、数字和小数点
    const pattern = /^[a-z0-9_.]+$/;
    if (!pattern.test(name)) {
        return false;
    }

    // 前缀后应为: bbmodel名称.动画名称（动画名称可包含点，但不得出现空段）
    const suffix = name.substring(ANIMATION_PREFIX.length);
    if (!suffix) {
        return false;
    }

    const segments = suffix.split('.');
    if (segments.length < 2) {
        return false;
    }

    // 第一段必须与bbmodel名称一致
    if (segments[0] !== bbmodelName) {
        return false;
    }

    // 不允许空段（避免以点结尾或出现 ..）
    if (segments.some(s => s.length === 0)) {
        return false;
    }

    return true;
}

/**
 * 生成符合规范的动画名称
 */
function generateValidAnimationName(name: string, bbmodelName: string): string {
    // 如果已经符合规范，直接返回
    if (isValidAnimationName(name, bbmodelName)) {
        return name;
    }

    // 移除不符合规范的字符，转为小写
    let cleanName = name.toLowerCase().replace(/[^a-z0-9_.]/g, '_');

    // 提取尽可能合理的动画名称部分
    let animationPart = '';

    if (cleanName.startsWith(ANIMATION_PREFIX)) {
        const suffix = cleanName.substring(ANIMATION_PREFIX.length);
        const idx = suffix.indexOf('.');
        animationPart = idx >= 0 ? suffix.substring(idx + 1) : suffix;
    } else if (cleanName.startsWith('animation.')) {
        const afterAnim = cleanName.substring('animation.'.length);
        const idx = afterAnim.indexOf('.');
        animationPart = idx >= 0 ? afterAnim.substring(idx + 1) : afterAnim;
    } else {
        animationPart = cleanName;
    }

    // 清理前后多余的点，避免空段
    animationPart = animationPart.replace(/^\.+/, '').replace(/\.+$/, '');
    if (!animationPart) {
        animationPart = 'default';
    }

    return `${ANIMATION_PREFIX}${bbmodelName}.${animationPart}`;
}

/**
 * 综合处理bbpack文件 - 包括检查和复制（异步优化版本）
 */
export async function processBbpackFiles(): Promise<void> {
    __setupLogger();
    const t0 = __prof.start();
    console.log("🚀 开始处理bbpack文件...");
    console.log("=".repeat(80));

    console.log("\n🔍 第零步：构建文件缓存");
    console.log("-".repeat(40));
    await buildFileCache();

    console.log("\n📝 第一步：检查动画名称规范");
    console.log("-".repeat(40));
    await checkAnimationIds();

    console.log("\n🔍 第二步：检查粒子引用关系");
    console.log("-".repeat(40));
    await checkParticleReferences();

    console.log("\n🔍 第三步：检查粒子ID");
    console.log("-".repeat(40));
    await checkParticleIds();

    console.log("\n🧩 第四步：修复粒子材质纹理路径");
    console.log("-".repeat(40));
    fixParticleTexturePaths();

    console.log("\n📋 第五步：修复flipbook UV");
    console.log("-".repeat(40));
    await fixFlipbookUVs();

    console.log("\n📦 第六步：复制bbpack文件");
    console.log("-".repeat(40));
    await copyBbpackFiles();

    console.log("\n🧹 清理数据缓存");
    console.log("-".repeat(40));
    clearDataCache();

    console.log("\n" + "=".repeat(80));
    console.log("🎉 bbpack文件处理完成！");
    console.log("=".repeat(80));
    __prof.end('processBbpackFiles_total', t0);
    __prof.report(40);
    __closeLogger();
    __restoreConsole();
}

// 如果直接运行此文件
if (require.main === module) {
    processBbpackFiles().catch(err => {
        console.error('❌ 处理过程中发生错误:', err);
        process.exit(1);
    });
}