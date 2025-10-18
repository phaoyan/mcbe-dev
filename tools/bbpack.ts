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
        start(): number { return Date.now(); },
        end(label: string, t0: number) {
            const dt = Date.now() - t0;
            const prev = stats.get(label) ?? { timeMs: 0, count: 0 };
            prev.timeMs += dt; prev.count += 1; stats.set(label, prev);
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

interface MissingReference {
    directory: string;
    bbmodelFile: string;
    missingId: string;
}

/**
 * 检查粒子引用关系
 */
export function checkParticleReferences(): void {
    const t0 = __prof.start();
    console.log("开始检查bbmodel与particle.json文件的引用关系...");
    console.log("=".repeat(60));

    let totalDirs = 0;
    let totalMissing = 0;
    const missingReferences: MissingReference[] = [];

    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    const tDirs = __prof.start();
    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));
    __prof.end('list_subdirs', tDirs);

    // 预先构建一次全局回退映射：唯一的回退目录为 BBPACK_DIR/@particles（只扫描一次）
    const tFallback = __prof.start();
    const globalFallbackIdToFile: Record<string, string> = {};
    const particlesFallbackDir = path.join(BBPACK_DIR, '@particles');
    if (fs.existsSync(particlesFallbackDir)) {
        const tGlob = __prof.start();
        const fallbackParticleFiles = rglob('.*\\.particle\\.json$', particlesFallbackDir);
        __prof.end('glob_fallback_particles', tGlob);
        const map = getParticleIdMap(fallbackParticleFiles);
        for (const [k, v] of Object.entries(map)) {
            if (!globalFallbackIdToFile[k]) globalFallbackIdToFile[k] = v;
        }
    }
    __prof.end('build_global_fallback_map', tFallback);

    for (const subdir of subdirs) {
        totalDirs++;
        const subdirName = path.basename(subdir);
        console.log(`\n检查目录: ${subdirName}`);

        const tGlob1 = __prof.start();
        const bbmodelFiles = rglob('.*\\.bbmodel$', subdir);
        __prof.end('glob_bbmodel', tGlob1);
        const tGlob2 = __prof.start();
        const particleFiles = rglob('.*\\.particle\\.json$', subdir);
        __prof.end('glob_particles', tGlob2);

        if (bbmodelFiles.length === 0) {
            console.log("  警告：目录中没有找到.bbmodel文件");
            continue;
        }

        const tIds = __prof.start();
        const availableParticleIds = getParticleIds(particleFiles);
        __prof.end('build_local_particle_ids', tIds);
        console.log(`  找到 ${particleFiles.length} 个particle.json文件，可用ID数量: ${availableParticleIds.size}`);

        for (const bbmodelFile of bbmodelFiles) {
            console.log(`  检查bbmodel: ${path.basename(bbmodelFile)}`);
            const tChk = __prof.start();
            const missingIds = checkSingleBbmodel(bbmodelFile, availableParticleIds);
            __prof.end('check_bbmodel_missing', tChk);

            if (missingIds.length > 0) {
                // 尝试回填：从上级 @particles 目录复制对应粒子
                const tCopy = __prof.start();
                for (const mid of missingIds) {
                    const src = globalFallbackIdToFile[mid];
                    if (src) {
                        try {
                            const dest = path.join(subdir, path.basename(src));
                            if (!fs.existsSync(dest)) {
                                fs.copyFileSync(src, dest);
                                console.log(`    ♻️  从 @particles 复制: ${mid} -> ${path.basename(dest)}`);
                            }
                            // 更新可用ID集合，便于后续判定
                            availableParticleIds.add(mid);
                        } catch (e) {
                            console.log(`    ⚠️  复制失败: ${mid} -> ${e}`);
                        }
                    }
                }
                __prof.end('copy_fallback_particles', tCopy);
                // 复制尝试后重新评估缺失
                const unresolved = missingIds.filter(id => !availableParticleIds.has(id));
                if (unresolved.length > 0) {
                    totalMissing += unresolved.length;
                    console.log(`    ❌ 找到 ${unresolved.length} 个缺失的粒子引用`);
                    for (const missingId of unresolved) {
                        missingReferences.push({
                            directory: subdirName,
                            bbmodelFile: path.basename(bbmodelFile),
                            missingId
                        });
                    }
                } else {
                    console.log("    ✅ 所有粒子引用都正常");
                }
            } else {
                console.log("    ✅ 所有粒子引用都正常");
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("检查完成！");
    console.log(`总共检查了 ${totalDirs} 个目录`);
    console.log(`总共发现 ${totalMissing} 个缺失的粒子引用`);
    __prof.end('checkParticleReferences_total', t0);

    if (missingReferences.length > 0) {
        console.log("\n" + "=".repeat(60));
        console.log("缺失的粒子引用详细列表：");
        console.log("=".repeat(60));

        let currentDir = "";
        for (const ref of missingReferences) {
            if (ref.directory !== currentDir) {
                currentDir = ref.directory;
                console.log(`\n📁 目录: ${currentDir}`);
            }
            console.log(`  🔸 文件: ${ref.bbmodelFile}`);
            console.log(`    ❌ 缺失ID: ${ref.missingId}`);
        }
    } else {
        console.log("\n🎉 所有bbmodel文件的粒子引用都正常！");
    }
}

/**
 * 检查并修复bbpack中粒子文件的命名空间
 */
export function checkParticleIds(): void {
    const t0 = __prof.start();
    console.log("开始检查并修复bbpack中的粒子ID命名空间...");
    console.log("=".repeat(60));

    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    let totalDirs = 0;
    let totalParticleFiles = 0;
    let totalFixed = 0;

    const tDirs = __prof.start();
    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));
    __prof.end('list_subdirs_checkParticleIds', tDirs);

    for (const subdir of subdirs) {
        totalDirs++;
        const subdirName = path.basename(subdir);
        console.log(`\n处理目录: ${subdirName}`);

        const tGlob = __prof.start();
        const particleFiles = rglob('.*\\.particle\\.json$', subdir);
        __prof.end('glob_particles_checkParticleIds', tGlob);

        if (particleFiles.length === 0) {
            console.log("  ℹ️  未找到particle.json文件");
            continue;
        }

        for (const particleFile of particleFiles) {
            totalParticleFiles++;
            try {
                const tRead = __prof.start();
                const data = readJson(particleFile);
                __prof.end('read_particle_json', tRead);
                const description = data?.particle_effect?.description;
                const identifier: string | undefined = description?.identifier;

                if (!identifier || typeof identifier !== 'string') {
                    console.log(`  ⚠️  跳过无identifier的文件: ${path.basename(particleFile)}`);
                    continue;
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
                    continue;
                }

                if (currentNamespace !== NAME_SPACE) {
                    const newIdentifier = `${NAME_SPACE}:${idWithoutNs}`;
                    data.particle_effect.description.identifier = newIdentifier;
                    const tWrite = __prof.start();
                    writeJson(particleFile, data);
                    __prof.end('write_particle_json', tWrite);
                    totalFixed++;
                    console.log(`  ✅ 修复: ${path.basename(particleFile)}  ${identifier} -> ${newIdentifier}`);
                } else {
                    console.log(`  ✅ 已正确: ${path.basename(particleFile)}  ${identifier}`);
                }
            } catch (error) {
                console.log(`  ❌ 处理文件 ${path.basename(particleFile)} 时出错: ${error}`);
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("检查完成！");
    console.log(`总共检查了 ${totalDirs} 个目录`);
    console.log(`共处理 ${totalParticleFiles} 个particle文件`);
    __prof.end('checkParticleIds_total', t0);
    if (totalFixed > 0) {
        console.log(`✅ 已修复 ${totalFixed} 个粒子ID命名空间`);
    } else {
        console.log("✅ 所有粒子ID命名空间均已正确");
    }
}

/**
 * 修正使用 flipbook 的粒子文件的 uv 与纹理尺寸
 * 规则：读取 basic_render_parameters.texture 对应 PNG 的真实宽高，
 * 将 uv.texture_width/texture_height 设为真实值；
 * 同时按新旧宽高比率分别缩放 uv.flipbook.base_UV / size_UV / step_UV。
 */
export function fixFlipbookUVs(): void {
    const t0 = __prof.start();
    if (!fs.existsSync(BBPACK_DIR)) {
        console.log('❌ bbpack 文件夹不存在！');
        return;
    }

    console.log('开始修正（bbpack）中使用 flipbook 的粒子 UV...');
    console.log('='.repeat(60));

    const tDirs = __prof.start();
    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => path.join(BBPACK_DIR, d.name));
    __prof.end('list_subdirs_fixFlipbookUVs', tDirs);

    let processed = 0;
    let updated = 0;
    let skipped = 0;

    for (const subdir of subdirs) {
        const tGlob = __prof.start();
        const particleFiles = rglob('.*\\.particle\\.json$', subdir);
        __prof.end('glob_particles_fixFlipbookUVs', tGlob);
        if (particleFiles.length === 0) continue;

        console.log(`\n处理目录: ${path.basename(subdir)}  （${particleFiles.length} 个 particle）`);

        for (const particleFile of particleFiles) {
            processed++;
            try {
                const tRead = __prof.start();
                const data: any = readJson(particleFile);
                __prof.end('read_particle_json_fixUV', tRead);
                const pe = data?.particle_effect;
                const desc = pe?.description;
                const comps = pe?.components;
                const billboard = comps?.["minecraft:particle_appearance_billboard"];
                const uv = billboard?.uv;
                const flipbook = uv?.flipbook;

                if (!billboard || !uv || !flipbook) {
                    skipped++;
                    continue; // 非 flipbook 的粒子，跳过
                }

                const textureRef = desc?.basic_render_parameters?.texture;
                if (typeof textureRef !== 'string' || textureRef.length === 0) {
                    console.log(`  ⚠️ 跳过（无有效纹理引用）: ${path.basename(particleFile)}`);
                    skipped++;
                    continue;
                }

                const tRes = __prof.start();
                const texturePath = resolveTexturePath(textureRef);
                __prof.end('resolve_texture_path', tRes);
                if (!texturePath) {
                    console.log(`  ⚠️ 跳过（找不到纹理文件）: ${path.basename(particleFile)} -> ${textureRef}`);
                    skipped++;
                    continue;
                }

                const tDim = __prof.start();
                const size = readPngDimensions(texturePath);
                __prof.end('read_png_dimensions', tDim);
                if (!size) {
                    console.log(`  ⚠️ 跳过（无法读取纹理尺寸）: ${path.basename(particleFile)} -> ${texturePath}`);
                    skipped++;
                    continue;
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

                // 写入真实纹理尺寸
                if (uv.texture_width !== realW) {
                    uv.texture_width = realW;
                    changed = true;
                }
                if (uv.texture_height !== realH) {
                    uv.texture_height = realH;
                    changed = true;
                }

                // 按比例缩放 flipbook 的三个向量字段
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
                    const tWrite = __prof.start();
                    writeJson(particleFile, data);
                    __prof.end('write_particle_json_fixUV', tWrite);
                    updated++;
                    console.log(`  ✅ 修正: ${path.basename(particleFile)} -> (${oldW}x${oldH}) => (${realW}x${realH})`);
                } else {
                    skipped++;
                }
            } catch (err) {
                console.log(`  ❌ 处理失败 ${path.basename(particleFile)}: ${err}`);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`处理完成（bbpack）。共扫描 ${processed} 个文件，修正 ${updated} 个，跳过 ${skipped} 个。`);
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
 * 修复 resource_packs 中 particles 的粒子文件纹理引用路径
 * 将无命名空间或命名空间为当前 NAME_SPACE 的 `textures/` 路径
 * 统一改写为 `textures/<团队>/<项目>/...`
 */
function fixParticleTexturePaths(): void {
    const particlesDir = path.join(RESOURCE_PACK_DIR, 'particles');
    if (!fs.existsSync(particlesDir)) {
        console.log('ℹ️ 找不到 particles 目录，跳过纹理路径修复');
        return;
    }

    const [teamName, projName] = NAME_SPACE.split('_', 2);
    const insertPrefix = `textures/${teamName}/${projName}/`;

    const files = rglob('.*\\.particle\\.json$', particlesDir);
    let updated = 0;
    let scanned = 0;
    const missingTextureReports: { particleFile: string; textureRefInFile: string; expectedPath: string }[] = [];

    for (const file of files) {
        try {
            const data: any = readJson(file);
            const desc = data?.particle_effect?.description;
            const brp = desc?.basic_render_parameters;
            const textureRef: unknown = brp?.texture;
            scanned++;

            if (typeof textureRef !== 'string' || textureRef.length === 0) {
                continue;
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
                continue;
            }

            if (!pathPart.startsWith('textures/')) {
                continue;
            }

            // 已包含团队/项目则跳过路径替换，但仍检查贴图存在性
            if (pathPart.startsWith(insertPrefix)) {
                const effectivePathPart = pathPart;
                const baseName = path.basename(effectivePathPart).replace(/\.png$/i, '');
                const expectedParticlePng = path.join(RESOURCE_PACK_DIR, 'textures', teamName, projName, 'particle', `${baseName}.png`);
                if (!fs.existsSync(expectedParticlePng)) {
                    missingTextureReports.push({
                        particleFile: path.basename(file),
                        textureRefInFile: textureRef,
                        expectedPath: path.relative(RESOURCE_PACK_DIR, expectedParticlePng).replace(/\\\\/g, '/')
                    });
                }
                continue;
            }

            const newPathPart = pathPart.replace(/^textures\//, insertPrefix);
            const newTextureRef = ns ? `${ns}:${newPathPart}` : newPathPart;

            if (newTextureRef !== textureRef) {
                data.particle_effect.description.basic_render_parameters.texture = newTextureRef;
                writeJson(file, data);
                updated++;
                console.log(`  ✅ 修复纹理: ${path.basename(file)}  ${textureRef} -> ${newTextureRef}`);
            }

            // 检查 particle 目录是否有对应贴图
            const effectivePathPart = newPathPart;
            const baseName = path.basename(effectivePathPart).replace(/\.png$/i, '');
            const expectedParticlePng = path.join(RESOURCE_PACK_DIR, 'textures', teamName, projName, 'particle', `${baseName}.png`);
            if (!fs.existsSync(expectedParticlePng)) {
                missingTextureReports.push({
                    particleFile: path.basename(file),
                    textureRefInFile: ns ? `${ns}:${effectivePathPart}` : effectivePathPart,
                    expectedPath: path.relative(RESOURCE_PACK_DIR, expectedParticlePng).replace(/\\\\/g, '/')
                });
            }
        } catch (err) {
            console.log(`  ❌ 修复纹理失败 ${path.basename(file)}: ${err}`);
        }
    }

    console.log(`  完成：扫描 ${scanned} 个粒子文件，更新 ${updated} 个纹理引用`);

    // 直接输出缺失贴图报告到日志（bbpack.log）
    if (missingTextureReports.length > 0) {
        console.log('缺失的粒子贴图报告');
        console.log('========================================');
        console.log(`总计缺失：${missingTextureReports.length}`);
        console.log('');
        for (const item of missingTextureReports) {
            console.log(`文件: ${item.particleFile}`);
            console.log(`引用: ${item.textureRefInFile}`);
            console.log(`期望存在: ${item.expectedPath}`);
            console.log('----------------------------------------');
        }
        console.log('  ⚠️ 上述缺失贴图信息已记录到 bbpack.log');
    } else {
        console.log('  ✅ 未发现缺失的粒子贴图');
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
 * 从particle文件列表中提取粒子ID
 */
function getParticleIds(particleFiles: string[]): Set<string> {
    const particleIds = new Set<string>();

    for (const particleFile of particleFiles) {
        try {
            const data = readJson(particleFile);
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
    }

    return particleIds;
}

/**
 * 构建 粒子ID -> 文件路径 的映射
 */
function getParticleIdMap(particleFiles: string[]): Record<string, string> {
    const idToFile: Record<string, string> = {};
    for (const file of particleFiles) {
        try {
            const data = readJson(file);
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
    }
    return idToFile;
}

/**
 * 检查单个bbmodel文件中的粒子引用
 */
function checkSingleBbmodel(bbmodelFile: string, availableParticleIds: Set<string>): string[] {
    const missingIds: string[] = [];

    try {
        const data = readJson(bbmodelFile);
        const animations = data.animations || [];

        if (animations.length === 0) {
            console.log(`    信息：${path.basename(bbmodelFile)} 没有animations，这是正常的`);
            return missingIds;
        }

        for (const animation of animations) {
            if (!animation || typeof animation !== 'object') {
                continue;
            }

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
                    if (effectId && !availableParticleIds.has(effectId)) {
                        if (!missingIds.includes(effectId)) {
                            missingIds.push(effectId);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log(`    错误：读取bbmodel文件 ${path.basename(bbmodelFile)} 时出错: ${error}`);
    }

    return missingIds;
}

/**
 * 复制bbpack文件
 */
export function copyBbpackFiles(): void {
    renameBbmodelFiles();

    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    const particlesTargetDir = path.join(RESOURCE_PACK_DIR, "particles");
    ensureDir(particlesTargetDir);

    console.log("开始复制bbpack中的particle文件...");
    console.log("=".repeat(60));

    // 清空particles文件夹中的.particle.json文件
    console.log("🧹 正在清空particles文件夹...");
    const particleFilesToRemove = rglob('.*\\.particle\\.json$', particlesTargetDir);
    let removedParticleCount = 0;

    for (const fileToRemove of particleFilesToRemove) {
        try {
            fs.unlinkSync(fileToRemove);
            removedParticleCount++;
        } catch (error) {
            console.log(`  ⚠️  删除文件失败 ${path.basename(fileToRemove)}: ${error}`);
        }
    }

    if (removedParticleCount > 0) {
        console.log(`  🗑️  删除了 ${removedParticleCount} 个旧的particle文件`);
    } else {
        console.log("  ℹ️  particles文件夹中没有旧文件需要删除");
    }

    console.log("\n📁 开始复制particle文件...");

    let totalDirs = 0;
    let totalParticleFiles = 0;

    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));

    for (const subdir of subdirs) {
        totalDirs++;
        const subdirName = path.basename(subdir);
        console.log(`\n处理目录: ${subdirName}`);

        const bbmodelFiles = rglob('.*\\.bbmodel$', subdir);
        const particleFiles = rglob('.*\\.particle\\.json$', subdir);

        for (const particleFile of particleFiles) {
            try {
                const targetPath = path.join(particlesTargetDir, path.basename(particleFile));
                fs.copyFileSync(particleFile, targetPath);
                console.log(`  ✅ 复制particle: ${path.basename(particleFile)} -> particles/`);
                totalParticleFiles++;
            } catch (error) {
                console.log(`  ❌ 复制particle失败 ${path.basename(particleFile)}: ${error}`);
            }
        }

        if (bbmodelFiles.length > 0 || particleFiles.length > 0) {
            console.log(`  📊 目录统计: ${bbmodelFiles.length} 个bbmodel文件(无需复制), ${particleFiles.length} 个particle文件`);
        } else {
            console.log("  ℹ️  目录中没有找到bbmodel或particle文件");
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("复制完成！");
    console.log(`总共处理了 ${totalDirs} 个目录`);
    console.log(`复制了 ${totalParticleFiles} 个particle文件到 ${particlesTargetDir}`);
    console.log("ℹ️  bbmodel文件无需复制，处理程序将直接从bbpack文件夹读取");
}

/**
 * 重命名bbmodel文件
 */
function renameBbmodelFiles(): void {
    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    console.log("开始重命名bbmodel文件...");
    console.log("=".repeat(60));

    let totalDirs = 0;
    let totalRenamed = 0;

    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));

    for (const subdir of subdirs) {
        totalDirs++;
        const subdirName = path.basename(subdir);
        console.log(`\n处理目录: ${subdirName}`);

        const bbmodelFiles = rglob('.*\\.bbmodel$', subdir);

        if (bbmodelFiles.length === 0) {
            console.log("  ℹ️  目录中没有找到bbmodel文件");
            continue;
        } else if (bbmodelFiles.length > 1) {
            console.log(`  ⚠️  目录中找到多个bbmodel文件: ${bbmodelFiles.map(f => path.basename(f)).join(', ')}`);
            console.log("  ⚠️  跳过重命名以避免冲突");
            continue;
        }

        const bbmodelFile = bbmodelFiles[0];
        const expectedName = `${subdirName}.bbmodel`;

        if (path.basename(bbmodelFile) === expectedName) {
            console.log(`  ✅ 文件名已正确: ${path.basename(bbmodelFile)}`);
        } else {
            try {
                const newPath = path.join(subdir, expectedName);
                fs.renameSync(bbmodelFile, newPath);
                console.log(`  🔄 重命名: ${path.basename(bbmodelFile)} -> ${expectedName}`);
                totalRenamed++;
            } catch (error) {
                console.log(`  ❌ 重命名失败 ${path.basename(bbmodelFile)}: ${error}`);
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("重命名完成！");
    console.log(`总共处理了 ${totalDirs} 个目录`);
    console.log(`成功重命名了 ${totalRenamed} 个bbmodel文件`);
}

/**
 * 检查动画名称规范
 */
export function checkAnimationIds(): void {
    const t0 = __prof.start();
    if (!fs.existsSync(BBPACK_DIR)) {
        console.log("❌ bbpack文件夹不存在！");
        return;
    }

    let totalDirs = 0;
    let totalFiles = 0;
    let totalFixed = 0;

    console.log("开始检查bbmodel文件中的动画名称规范...");
    console.log("=".repeat(60));

    const tDirs = __prof.start();
    const subdirs = fs.readdirSync(BBPACK_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(BBPACK_DIR, dirent.name));
    __prof.end('list_subdirs_checkAnimationIds', tDirs);

    for (const subdir of subdirs) {
        totalDirs++;
        const bbmodelFiles = rglob('.*\\.bbmodel$', subdir);

        for (const bbmodelFile of bbmodelFiles) {
            totalFiles++;
            try {
                const tRead = __prof.start();
                const data = readJson(bbmodelFile);
                __prof.end('read_bbmodel_json', tRead);
                let fileModified = false;
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

                                // 在TypeScript版本中，我们可以生成一个建议的名称而不是要求用户输入
                                const suggestedName = generateValidAnimationName(name, bbmodelBaseName);
                                data.animations[i].name = suggestedName;
                                fileModified = true;
                                totalFixed++;
                                console.log(`✅ 名称已自动修改: ${name} -> ${suggestedName}`);
                            }
                        }
                    }
                }

                if (fileModified) {
                    const tWrite = __prof.start();
                    writeJson(bbmodelFile, data);
                    __prof.end('write_bbmodel_json', tWrite);
                    console.log(`💾 文件已保存: ${path.relative(BBPACK_DIR, bbmodelFile)}`);
                }
            } catch (error) {
                console.log(`读取文件 ${path.relative(BBPACK_DIR, bbmodelFile)} 时出错: ${error}`);
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("检查完成！");
    console.log(`总共检查了 ${totalDirs} 个目录中的 ${totalFiles} 个bbmodel文件`);
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
 * 综合处理bbpack文件 - 包括检查和复制
 */
export function processBbpackFiles(): void {
    __setupLogger();
    const t0 = __prof.start();
    console.log("🚀 开始处理bbpack文件...");
    console.log("=".repeat(80));

    console.log("\n📝 第一步：检查动画名称规范");
    console.log("-".repeat(40));
    checkAnimationIds();

    console.log("\n🔍 第二步：检查粒子引用关系");
    console.log("-".repeat(40));
    checkParticleReferences();

    console.log("\n🔍 第三步：检查粒子ID");
    console.log("-".repeat(40));
    checkParticleIds();

    console.log("\n📋 第三步：复制bbpack文件");
    console.log("-".repeat(40));
    copyBbpackFiles();

    console.log("\n🧩 第四步：修复粒子材质纹理路径");
    console.log("-".repeat(40));
    fixParticleTexturePaths();

    console.log("\n📋 第五步：修复flipbook UV");
    console.log("-".repeat(40));
    fixFlipbookUVs()

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
    processBbpackFiles();
}