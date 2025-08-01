import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
    BBPACK_DIR,
    RESOURCE_PACK_DIR,
    SCRIPTS_DIR,
    NAME_SPACE,
    JSON_INDENT,
    rglob,
    writeJson,
    readJson,
    ensureDir
} from './utils';

/**
 * 列出所有bbmodel文件
 */
function listBbmodelFiles(): string[] {
    return rglob('\\.bbmodel$', BBPACK_DIR);
}

/**
 * 设置bbmodel基本信息
 */
function setupBasic(bbmodelFile: string): void {
    const data = readJson(bbmodelFile);
    const basename = path.basename(bbmodelFile, '.bbmodel');

    data.model_identifier = `${NAME_SPACE}.${basename}`;
    data.name = basename;

    const model: string = data.model_identifier;
    const textures: any[] = data.textures || [];
    const animations: any[] = data.animations || [];

    // 处理动画
    for (const animation of animations) {
        animation.path = path.resolve(RESOURCE_PACK_DIR, "animations", `${model}.animation.json`);
        const animName: string = animation.name || "";
        if (!animName.startsWith("animation.")) {
            animation.name = `animation.${NAME_SPACE}.${basename}.${animName}`;
        }
    }

    // 处理纹理
    for (let idx = 0; idx < textures.length; idx++) {
        const texture = textures[idx];
        texture.name = `${basename}_${idx}`;
        texture.path = path.resolve(RESOURCE_PACK_DIR, "textures", "entity", texture.name);
    }

    writeJson(bbmodelFile, data);
}

/**
 * 设置bbmodel配置JSON
 */
function setupBbmodelJson(): void {
    const data: Record<string, any> = {};

    const bbmodelFiles = rglob('\\.bbmodel$', BBPACK_DIR);

    for (const bbmodelFile of bbmodelFiles) {
        const bbmodel = readJson(bbmodelFile);
        const basename = path.basename(bbmodelFile, '.bbmodel');
        const animations = bbmodel.animations || [];

        // 提取粒子效果
        const effectsList = animations
            .map((animation: any) => animation.animators?.effects)
            .filter((effects: any) => effects !== undefined);

        const particles: Record<string, string> = {};
        for (const effects of effectsList) {
            const keyframes = effects.keyframes || [];
            for (const kf of keyframes) {
                if (kf.channel === "particle") {
                    const dataPoints = kf.data_points || [];
                    for (const dp of dataPoints) {
                        const name = dp.effect;
                        if (name) {
                            particles[name] = `${NAME_SPACE}:${name}`;
                        }
                    }
                }
            }
        }

        // 提取声音效果
        const sounds: Record<string, string> = {};
        for (const effects of effectsList) {
            const keyframes = effects.keyframes || [];
            for (const kf of keyframes) {
                if (kf.channel === "sound") {
                    const dataPoints = kf.data_points || [];
                    for (const dp of dataPoints) {
                        const name = dp.effect;
                        if (name) {
                            sounds[name] = `${NAME_SPACE}:${name}`;
                        }
                    }
                }
            }
        }

        const modelIdentifier = bbmodel.model_identifier || `${NAME_SPACE}.${basename}`;
        const textures = bbmodel.textures || [];

        data[basename] = {
            geometry: modelIdentifier,
            textures: textures.map((texture: any, i: number) =>
                texture.name || `${basename}_${i}`
            ),
            animations: Object.fromEntries(
                animations
                    .filter((animation: any) => animation.name)
                    .map((animation: any) => {
                        const animName = animation.name;
                        const shortName = animName.includes('.') ? animName.split('.').pop() : animName;
                        return [shortName, animName];
                    })
            ),
            animation_length: Object.fromEntries(
                animations
                    .filter((animation: any) => animation.name)
                    .map((animation: any) => {
                        const animName = animation.name;
                        const shortName = animName.includes('.') ? animName.split('.').pop() : animName;
                        return [shortName, animation.length || 0];
                    })
            ),
            particle_effects: particles,
            sound_effects: sounds
        };

        console.log(`处理bbmodel: ${basename}, 动画数量: ${animations.length}`);
    }

    const bbmodelJsonPath = path.join(BBPACK_DIR, "bbmodel.json");
    writeJson(bbmodelJsonPath, data);

    ensureDir(path.join(SCRIPTS_DIR, "json"));
    writeJson(path.join(SCRIPTS_DIR, "json", "bbmodel.json"), data);

    console.log(`生成bbmodel.json完成，包含 ${Object.keys(data).length} 个模型`);
}

/**
 * 保存base64图片
 */
function saveBase64Image(base64Str: string, outputPath: string): void {
    let base64Data: string;
    if (base64Str.startsWith("data:image")) {
        base64Data = base64Str.split(",")[1];
    } else {
        base64Data = base64Str;
    }

    const imageData = Buffer.from(base64Data, 'base64');
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, imageData);
    console.log(`图片已保存到: ${outputPath}`);
}

/**
 * 导出纹理
 */
function exportTexture(bbmodelFile: string): void {
    const outputDir = path.join(RESOURCE_PACK_DIR, "textures", "entity");
    const bbmodel = readJson(bbmodelFile);
    const textures = bbmodel.textures || [];

    for (const texture of textures) {
        const imageBase64 = texture.source;
        const textureName = texture.name || `${path.basename(bbmodelFile, '.bbmodel')}_texture`;

        if (imageBase64) {
            saveBase64Image(
                imageBase64,
                path.join(outputDir, `${textureName.replace('.png', '')}.png`)
            );
        }
    }
}

/**
 * 导出几何体
 */
function exportGeometry(bbmodelFile: string, ignores: string[]): void {
    const basename = path.basename(bbmodelFile, '.bbmodel');
    const targetModelPath = path.join(
        RESOURCE_PACK_DIR,
        "models",
        "entity",
        `${basename}.geo.json`
    );
    ensureDir(path.dirname(targetModelPath));

    const bbmodel = readJson(bbmodelFile);
    const elements = bbmodel.elements || [];

    // 过滤掉忽略的元素
    bbmodel.elements = elements.filter((element: any) =>
        !ignores.includes(element.name || "")
    );

    // 创建临时的bbmodel文件用于转换
    const tempBbmodelPath = path.join(
        RESOURCE_PACK_DIR,
        "models",
        "entity",
        path.basename(bbmodelFile)
    );
    writeJson(tempBbmodelPath, bbmodel);

    // 运行bbmodel转换器
    const converterPath = path.join(RESOURCE_PACK_DIR, "bbmodel-converter.js");
    if (fs.existsSync(converterPath)) {
        try {
            execSync(`node "${converterPath}"`, {
                cwd: RESOURCE_PACK_DIR,
                stdio: 'inherit'
            });
            console.log(`几何体导出成功: ${basename}.geo.json`);

            // 清理临时bbmodel文件
            if (fs.existsSync(tempBbmodelPath)) {
                fs.unlinkSync(tempBbmodelPath);
            }
        } catch (error) {
            console.error(`运行bbmodel转换器失败: ${error}`);
        }
    } else {
        console.warn(`bbmodel转换器不存在: ${converterPath}`);
        // 如果转换器不存在，直接复制bbmodel文件为几何体文件
        writeJson(targetModelPath, bbmodel);
    }
}

/**
 * 检查是否为浮点数
 */
function isFloat(s: any): boolean {
    return !isNaN(parseFloat(s)) && isFinite(s);
}

/**
 * 导出动画
 */
function exportAnimation(bbmodelFile: string): void {
    const bbmodel = readJson(bbmodelFile);
    const basename = path.basename(bbmodelFile, '.bbmodel');
    const targetPath = path.join(RESOURCE_PACK_DIR, "animations", `${basename}.animation.json`);
    ensureDir(path.dirname(targetPath));

    const animations: any[] = bbmodel.animations || [];

    if (animations.length === 0) {
        console.log(`${basename}: 没有动画数据，跳过动画导出`);
        return;
    }

    const outputAnimations: Record<string, any> = {};

    for (const animation of animations) {
        if (!animation.animators) {
            continue;
        }

        const name = animation.name || "";
        if (!name) {
            continue;
        }

        const animationLength = animation.length || 0;
        const overridePreviousAnimation = animation.override || false;
        const loopMode = animation.loop || "once";

        let loop: boolean | string = false;
        if (loopMode === "loop") {
            loop = true;
        } else if (loopMode === "hold") {
            loop = "hold_on_last_frame";
        }

        const bones: Record<string, any> = {};
        const particleEffects: Record<string, any> = {};
        const soundEffects: Record<string, any> = {};

        const animators = animation.animators || {};
        for (const animator of Object.values(animators) as any[]) {
            const animatorName = animator.name || "";
            const animatorType = animator.type || "";
            const keyframes = animator.keyframes || [];

            if (animatorType === "bone") {
                const boneData: Record<string, any> = {};

                for (const keyframe of keyframes) {
                    const channel = keyframe.channel || "";
                    const time = keyframe.time || 0;
                    const dataPoints = keyframe.data_points || [];
                    const interpolation = keyframe.interpolation || "linear";

                    if (dataPoints.length > 0) {
                        const firstPoint = dataPoints[0];
                        let points = [
                            firstPoint.x || 0,
                            firstPoint.y || 0,
                            firstPoint.z || 0
                        ];

                        points = points.map(dp => isFloat(dp) ? parseFloat(dp) : dp);

                        let fillin: any;
                        if (interpolation === "linear") {
                            fillin = points;
                        } else if (interpolation === "catmullrom") {
                            fillin = {
                                pre: points,
                                post: points,
                                lerp_mode: "catmullrom"
                            };
                        }

                        if (fillin !== undefined) {
                            if (!boneData[channel]) {
                                boneData[channel] = {};
                            }
                            boneData[channel][time.toString()] = fillin;
                        }
                    }
                }

                if (Object.keys(boneData).length > 0) {
                    bones[animatorName] = boneData;
                }
            } else if (animatorType === "effect") {
                for (const keyframe of keyframes) {
                    const channel = keyframe.channel || "";
                    const time = keyframe.time || 0;

                    if (channel === "particle") {
                        const dataPoints = (keyframe.data_points || [])
                            .map((dp: any) => ({
                                effect: dp.effect || "",
                                locator: dp.locator || ""
                            }))
                            .filter((dp: any) => dp.effect);

                        if (dataPoints.length > 0) {
                            particleEffects[time.toString()] = dataPoints;
                        }
                    } else if (channel === "sound") {
                        const dataPoints = (keyframe.data_points || [])
                            .map((dp: any) => ({
                                effect: dp.effect || ""
                            }))
                            .filter((dp: any) => dp.effect);

                        if (dataPoints.length > 0) {
                            soundEffects[time.toString()] = dataPoints;
                        }
                    }
                }
            }
        }

        outputAnimations[name] = {
            animation_length: animationLength,
            override_previous_animation: overridePreviousAnimation,
            loop
        };

        if (Object.keys(bones).length > 0) {
            outputAnimations[name].bones = bones;
        }
        if (Object.keys(particleEffects).length > 0) {
            outputAnimations[name].particle_effects = particleEffects;
        }
        if (Object.keys(soundEffects).length > 0) {
            outputAnimations[name].sound_effects = soundEffects;
        }

        console.log(`导出动画: ${name} (长度: ${animationLength}s)`);
    }

    if (Object.keys(outputAnimations).length === 0) {
        console.log(`${basename}: 没有有效的动画数据，跳过动画导出`);
        return;
    }

    writeJson(targetPath, {
        format_version: "1.8.0",
        animations: outputAnimations
    });

    console.log(`动画文件导出成功: ${basename}.animation.json (${Object.keys(outputAnimations).length} 个动画)`);
}

/**
 * 部署bbmodel文件
 */
function deployBbmodel(bbmodelFile: string): void {
    exportTexture(bbmodelFile);
    exportGeometry(bbmodelFile, ["hitbox"]);
    exportAnimation(bbmodelFile);
}

/**
 * 设置所有bbmodel文件
 */
export function setupBbmodels(): void {
    const bbmodelFiles = listBbmodelFiles();

    for (const bbmodelFile of bbmodelFiles) {
        setupBasic(bbmodelFile);
        deployBbmodel(bbmodelFile);
    }

    setupBbmodelJson();
}

// 如果直接运行此文件
if (require.main === module) {
    setupBbmodels();
}