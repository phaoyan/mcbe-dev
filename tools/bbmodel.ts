import * as fs from 'fs';
import * as path from 'path';
import {
    BBPACK_DIR,
    RESOURCE_PACK_DIR,
    SCRIPTS_DIR,
    NAME_SPACE,
    writeJson,
    readJson,
    ensureDir,
    TOOLS_DIR
} from './utils';

// 部署状态文件路径
const OUTPUTS_DIR = path.join(TOOLS_DIR, 'outputs');
const DEPLOY_STATE_FILE = path.join(OUTPUTS_DIR, 'bbmodel_deploy_state.json');

// 部署时间阈值（毫秒），默认 1 秒
const DEPLOY_TIME_THRESHOLD = 1000;

/**
 * 部署状态接口
 */
interface DeployState {
    [filePath: string]: {
        lastDeployTime: number;  // 上次部署时间戳
        lastModifyTime: number;  // 部署时文件的修改时间
    };
}

/**
 * 读取部署状态
 */
function loadDeployState(): DeployState {
    try {
        if (fs.existsSync(DEPLOY_STATE_FILE)) {
            return readJson(DEPLOY_STATE_FILE);
        }
    } catch (error) {
        console.log(`⚠️ 读取部署状态失败: ${error}`);
    }
    return {};
}

/**
 * 保存部署状态
 */
function saveDeployState(state: DeployState): void {
    try {
        ensureDir(OUTPUTS_DIR);
        writeJson(DEPLOY_STATE_FILE, state);
    } catch (error) {
        console.log(`⚠️ 保存部署状态失败: ${error}`);
    }
}

/**
 * 检查文件是否需要部署
 */
function needsDeploy(bbmodelFile: string, deployState: DeployState, force: boolean): boolean {
    if (force) {
        return true;
    }

    try {
        const stats = fs.statSync(bbmodelFile);
        const currentMtime = stats.mtimeMs;
        const state = deployState[bbmodelFile];

        if (!state) {
            // 未记录过部署状态，需要部署
            return true;
        }

        // 检查文件修改时间是否晚于上次部署时记录的修改时间
        if (currentMtime > state.lastModifyTime + DEPLOY_TIME_THRESHOLD) {
            return true;
        }

        return false;
    } catch (error) {
        // 文件不存在或读取失败，默认需要部署
        return true;
    }
}

/**
 * 更新部署状态
 */
function updateDeployState(bbmodelFile: string, deployState: DeployState): void {
    try {
        const stats = fs.statSync(bbmodelFile);
        deployState[bbmodelFile] = {
            lastDeployTime: Date.now(),
            lastModifyTime: stats.mtimeMs
        };
    } catch (error) {
        console.log(`⚠️ 更新部署状态失败 ${bbmodelFile}: ${error}`);
    }
}

/**
 * 列出所有bbmodel文件
 * bbmodel文件固定存放在 bbpack/bbmodels/ 目录下
 */
function listBbmodelFiles(): string[] {
    const bbmodelsDir = path.join(BBPACK_DIR, 'bbmodels');

    if (!fs.existsSync(bbmodelsDir)) {
        console.warn(`⚠️ bbmodels 目录不存在: ${bbmodelsDir}`);
        return [];
    }

    return fs.readdirSync(bbmodelsDir)
        .filter(file => file.endsWith('.bbmodel'))
        .map(file => path.join(bbmodelsDir, file));
}

/**
 * 设置bbmodel基本信息
 */
function setupBasic(bbmodelFile: string): void {
    const data = readJson(bbmodelFile);
    const basename = path.basename(bbmodelFile, '.bbmodel');

    let hasChanges = false;

    // 检查并更新 model_identifier
    const expectedModelId = `${NAME_SPACE}.${basename}`;
    if (data.model_identifier !== expectedModelId) {
        data.model_identifier = expectedModelId;
        hasChanges = true;
    }

    // 检查并更新 name
    if (data.name !== basename) {
        data.name = basename;
        hasChanges = true;
    }

    const model: string = data.model_identifier;
    const textures: any[] = data.textures || [];
    const animations: any[] = data.animations || [];

    // 处理动画
    function normalizeAnimationName(rawName: string, base: string): string {
        const trimmed = (rawName || "").trim();
        const defaultTail = "default";

        // 提取尾部（去除前缀、命名空间、重复的basename），保留多级后缀
        let tailSegments: string[] = [];
        if (trimmed.startsWith("animation.")) {
            const afterAnim = trimmed.substring("animation.".length);
            const parts = afterAnim.split('.').filter(s => s.length > 0);
            // 去掉可能存在的命名空间段
            if (parts.length > 0) parts.shift();
            // 去掉一个或多个前置的 basename 段
            while (parts.length > 0 && parts[0] === base) {
                parts.shift();
            }
            tailSegments = parts;
        } else {
            const parts = trimmed.split('.').filter(s => s.length > 0);
            // 去掉一个或多个前置的 basename 段
            while (parts.length > 0 && parts[0] === base) {
                parts.shift();
            }
            tailSegments = parts;
        }

        const tail = (tailSegments.length > 0 ? tailSegments.join('.') : defaultTail);
        return `animation.${NAME_SPACE}.${base}.${tail}`;
    }

    // 检查并更新动画
    const expectedAnimPath = path.resolve(RESOURCE_PACK_DIR, "animations", `${model}.animation.json`);
    for (const animation of animations) {
        const expectedName = normalizeAnimationName(animation.name || "", basename);

        if (animation.path !== expectedAnimPath) {
            animation.path = expectedAnimPath;
            hasChanges = true;
        }

        if (animation.name !== expectedName) {
            animation.name = expectedName;
            hasChanges = true;
        }
    }

    // 检查并更新纹理
    const [teamName, projName] = NAME_SPACE.split('_', 2);
    for (let idx = 0; idx < textures.length; idx++) {
        const texture = textures[idx];
        const expectedTextureName = `${basename}_${idx}`;
        const expectedTexturePath = path.resolve(RESOURCE_PACK_DIR, "textures", teamName, projName, "entity", expectedTextureName);

        if (texture.name !== expectedTextureName) {
            texture.name = expectedTextureName;
            hasChanges = true;
        }

        if (texture.path !== expectedTexturePath) {
            texture.path = expectedTexturePath;
            hasChanges = true;
        }
    }

    // 只在有实质性修改时才写入文件
    if (hasChanges) {
        writeJson(bbmodelFile, data);
        console.log(`✅ 更新bbmodel: ${basename}`);
    }
}

/**
 * 设置bbmodel配置JSON
 */
function setupBbmodelJson(): void {
    const data: Record<string, any> = {};

    const bbmodelFiles = listBbmodelFiles();

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
                        const name = dp.effect.trim();
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
                        const name = dp.effect.trim();
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
            id: basename,
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

    }

    writeJson(path.join(BBPACK_DIR, "bbmodel.json"), data);
    writeJson(path.join(TOOLS_DIR, "json", "bbmodel.json"), data);
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
    const [teamName, projName] = NAME_SPACE.split('_', 2);
    const outputDir = path.join(RESOURCE_PACK_DIR, "textures", teamName, projName, "entity");
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
 * 获取所有骨骼组（带层级关系和子元素）
 */
function getAllGroups(data: any): any[] {
    const groupsArray = data.groups || [];
    const groupsMap = new Map<string, any>();

    // 创建UUID到组对象的映射
    for (const group of groupsArray) {
        if (group.uuid) {
            groupsMap.set(group.uuid, { ...group, elementChildren: [] });
        }
    }

    const result: any[] = [];

    function iterate(array: any[], parent: string | undefined) {
        for (const item of array) {
            if (typeof item === 'object' && item.uuid) {
                // outliner中直接包含的骨骼组对象
                let group = groupsMap.get(item.uuid);
                if (!group) {
                    group = { ...item, elementChildren: [] };
                    groupsMap.set(item.uuid, group);
                }
                group.parent = parent;

                // 将这个组添加到结果中（如果还没有添加）
                if (!result.find(g => g.uuid === group.uuid)) {
                    result.push(group);
                }

                // 处理children：分离骨骼组和元素
                if (item.children && Array.isArray(item.children)) {
                    for (const child of item.children) {
                        if (typeof child === 'string') {
                            // 字符串是元素UUID，添加到elementChildren
                            group.elementChildren.push(child);
                        } else if (typeof child === 'object' && child.uuid) {
                            // 对象是子骨骼组，递归处理
                            iterate([child], group.name);
                        }
                    }
                }
            }
        }
    }

    iterate(data.outliner || [], undefined);
    return result;
}

/**
 * 计算可见边界
 */
function calculateVisibleBox(data: any): [number, number, number] {
    let visibleBox = {
        max: { x: 0, y: 0, z: 0 },
        min: { x: 0, y: 0, z: 0 }
    };

    const elements = data.elements || [];
    for (const element of elements) {
        if (!element.to || !element.from) continue;

        visibleBox.max.x = Math.max(visibleBox.max.x, element.from[0], element.to[0]);
        visibleBox.min.x = Math.min(visibleBox.min.x, element.from[0], element.to[0]);
        visibleBox.max.y = Math.max(visibleBox.max.y, element.from[1], element.to[1]);
        visibleBox.min.y = Math.min(visibleBox.min.y, element.from[1], element.to[1]);
        visibleBox.max.z = Math.max(visibleBox.max.z, element.from[2], element.to[2]);
        visibleBox.min.z = Math.min(visibleBox.min.z, element.from[2], element.to[2]);
    }

    visibleBox.max.x += 8;
    visibleBox.min.x += 8;
    visibleBox.max.y += 8;
    visibleBox.min.y += 8;
    visibleBox.max.z += 8;
    visibleBox.min.z += 8;

    // 计算宽度
    let radius = Math.max(
        visibleBox.max.x,
        visibleBox.max.z,
        -visibleBox.min.x,
        -visibleBox.min.z
    );
    if (!isFinite(radius)) radius = 0;
    let width = Math.ceil((radius * 2) / 16);
    width = Math.max(width, data.visible_box?.[0] || 0);

    // 计算高度
    let yMin = Math.floor(visibleBox.min.y / 16);
    let yMax = Math.ceil(visibleBox.max.y / 16);
    if (!isFinite(yMin)) yMin = 0;
    if (!isFinite(yMax)) yMax = 0;
    const visBox = data.visible_box || [0, 0, 0];
    yMin = Math.min(yMin, visBox[2] - visBox[1] / 2);
    yMax = Math.max(yMax, visBox[2] + visBox[1] / 2);

    return [width, yMax - yMin, (yMax + yMin) / 2];
}

/**
 * 编译立方体
 */
function compileCube(data: any, element: any, boneMirror: boolean): any {
    const cube: any = {
        origin: [
            -(element.from[0] + (element.to[0] - element.from[0])),
            element.from[1],
            element.from[2]
        ],
        size: [
            element.to[0] - element.from[0],
            element.to[1] - element.from[1],
            element.to[2] - element.from[2]
        ]
    };

    if (element.inflate) {
        cube.inflate = element.inflate;
    }

    // 处理旋转
    if (element.rotation && (element.rotation[0] !== 0 || element.rotation[1] !== 0 || element.rotation[2] !== 0)) {
        cube.pivot = [-element.origin[0], element.origin[1], element.origin[2]];
        cube.rotation = [
            -element.rotation[0],
            -element.rotation[1],
            element.rotation[2]
        ];
    }

    // 处理UV
    if (data.meta?.box_uv) {
        // box_uv 模式下，若没有 uv_offset，默认为 [0,0]
        cube.uv = element.uv_offset || [0, 0];
        if (element.mirror_uv !== boneMirror) {
            cube.mirror = element.mirror_uv;
        }
    } else {
        const uvMap: any = {};
        for (const faceKey in element.faces || {}) {
            const face = element.faces[faceKey];
            if (face.texture !== null) {
                uvMap[faceKey] = {
                    uv: [face.uv[0], face.uv[1]],
                    uv_size: [face.uv[2] - face.uv[0], face.uv[3] - face.uv[1]]
                };
                if (face.rotation) {
                    uvMap[faceKey].uv_rotation = face.rotation;
                }
                if (face.material_name) {
                    uvMap[faceKey].material_instance = face.material_name;
                }
                if (faceKey === "up" || faceKey === "down") {
                    uvMap[faceKey].uv[0] += uvMap[faceKey].uv_size[0];
                    uvMap[faceKey].uv[1] += uvMap[faceKey].uv_size[1];
                    uvMap[faceKey].uv_size[0] *= -1;
                    uvMap[faceKey].uv_size[1] *= -1;
                }
            }
        }
        cube.uv = uvMap;
    }

    return cube;
}

/**
 * 编译骨骼组
 */
function compileGroup(data: any, group: any, elementsMap: Map<string, any>): any {
    // 键顺序：name -> parent -> pivot （与历史生成器一致）
    const bone: any = { name: group.name };

    if (group.parent) {
        bone.parent = group.parent;
    }

    bone.pivot = [-group.origin[0], group.origin[1], group.origin[2]];

    if (group.rotation && (group.rotation[0] !== 0 || group.rotation[1] !== 0 || group.rotation[2] !== 0)) {
        bone.rotation = [-group.rotation[0], -group.rotation[1], group.rotation[2]];
    }

    if (group.bedrock_binding) {
        bone.binding = group.bedrock_binding;
    }

    if (group.reset) {
        bone.reset = true;
    }

    if (group.mirror_uv && data.meta?.box_uv) {
        bone.mirror = true;
    }

    if (group.material) {
        bone.material = group.material;
    }

    const cubes: any[] = [];
    const locators: any = {};

    // 使用 elementChildren 来获取该骨骼组的直接子元素
    for (const childUuid of group.elementChildren || []) {
        const element = elementsMap.get(childUuid);
        if (!element) continue;

        if (element.type === 'locator') {
            const key = element.name;
            if (element.rotation && (element.rotation[0] !== 0 || element.rotation[1] !== 0 || element.rotation[2] !== 0)) {
                locators[key] = {
                    // X 轴取反以匹配坐标系
                    offset: [-element.position[0], element.position[1], element.position[2]],
                    rotation: [element.rotation[0], element.rotation[1], element.rotation[2]]
                };
            } else {
                locators[key] = [-element.position[0], element.position[1], element.position[2]];
            }
        } else if (element.visibility !== false) {
            // 是一个立方体
            cubes.push(compileCube(data, element, bone.mirror || false));
        }
    }

    if (cubes.length > 0) {
        bone.cubes = cubes;
    }

    if (Object.keys(locators).length > 0) {
        bone.locators = locators;
    }

    return bone;
}

/**
 * 编译JSON为紧凑格式（模仿bbmodel-converter.js的格式）
 */
function compileJSON(object: any): string {
    function newLine(tabs: number): string {
        let s = "\n";
        for (let i = 0; i < tabs; i++) {
            s += "\t";
        }
        return s;
    }

    function escape(str: string): string {
        return str
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n|\r\n/g, "\\n")
            .replace(/\t/g, "\\t");
    }

    function handleVar(o: any, tabs: number): string {
        let out = "";
        if (typeof o === "string") {
            out += '"' + escape(o) + '"';
        } else if (typeof o === "boolean") {
            out += o ? "true" : "false";
        } else if (o === null || o === Infinity || o === -Infinity) {
            out += "null";
        } else if (typeof o === "number") {
            const cleaned = cleanNumber(o);
            out += cleaned.toString();
        } else if (typeof o === "object" && Array.isArray(o)) {
            // 数组
            let hasContent = false;
            out += "[";
            for (let i = 0; i < o.length; i++) {
                const compiled = handleVar(o[i], tabs + 1);
                if (compiled) {
                    const breaks = typeof o[i] === "object";
                    if (hasContent) {
                        out += "," + (breaks ? "" : " ");
                    }
                    if (breaks) {
                        out += newLine(tabs);
                    }
                    out += compiled;
                    hasContent = true;
                }
            }
            if (typeof o[o.length - 1] === "object") {
                out += newLine(tabs - 1);
            }
            out += "]";
        } else if (typeof o === "object") {
            // 对象
            const breaks = (o.constructor as any).name !== "oneLiner";
            let hasContent = false;
            out += "{";
            for (const key in o) {
                if (o.hasOwnProperty(key)) {
                    const compiled = handleVar(o[key], tabs + 1);
                    if (compiled) {
                        if (hasContent) {
                            out += "," + (breaks ? "" : " ");
                        }
                        if (breaks) {
                            out += newLine(tabs);
                        }
                        out += '"' + escape(key) + '": ';
                        out += compiled;
                        hasContent = true;
                    }
                }
            }
            if (breaks && hasContent) {
                out += newLine(tabs - 1);
            }
            out += "}";
        }
        return out;
    }

    return handleVar(object, 1);
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

    // 过滤掉忽略的元素
    const elements = (bbmodel.elements || []).filter((element: any) =>
        !ignores.includes(element.name || "")
    );

    // 创建元素UUID映射
    const elementsMap = new Map<string, any>();
    for (const element of elements) {
        if (element.uuid) {
            elementsMap.set(element.uuid, element);
        }
    }

    // 更新bbmodel的elements
    bbmodel.elements = elements;

    // 获取所有骨骼组
    const groups = getAllGroups(bbmodel);
    const bones: any[] = [];

    for (const group of groups) {
        const bone = compileGroup(bbmodel, group, elementsMap);
        bones.push(bone);
    }

    // 计算可见边界
    const visibleBox = calculateVisibleBox(bbmodel);

    // 构建输出结构
    const geometry: any = {
        description: {
            identifier: `geometry.${bbmodel.model_identifier || basename}`,
            texture_width: bbmodel.resolution?.width || 64,
            texture_height: bbmodel.resolution?.height || 64
        }
    };

    if (bones.length > 0) {
        geometry.description.visible_bounds_width = visibleBox[0] || 0;
        geometry.description.visible_bounds_height = visibleBox[1] || 0;
        geometry.description.visible_bounds_offset = [0, visibleBox[2] || 0, 0];
        geometry.bones = bones;
    }

    const output = {
        format_version: "1.12.0",
        "minecraft:geometry": [geometry]
    };

    // 使用自定义格式化，保持与 bbmodel-converter.js 一致的格式
    ensureDir(path.dirname(targetModelPath));
    fs.writeFileSync(targetModelPath, compileJSON(output), 'utf-8');
    console.log(`几何体导出成功: ${basename}.geo.json (${bones.length} 个骨骼)`);
}

/**
 * 检查是否为浮点数
 */
function isFloat(s: any): boolean {
    return !isNaN(parseFloat(s)) && isFinite(s);
}

/**
 * 清理数值：将极小值设为0，限制极大值，保持合理精度
 */
function cleanNumber(n: any, epsilon: number = 1e-6, maxValue: number = 1e8): any {
    // 如果不是数字，直接返回（可能是表达式字符串）
    if (typeof n !== 'number') {
        return n;
    }

    // 检查是否为无效值
    if (!isFinite(n) || isNaN(n)) {
        return 0;
    }

    // 极小值视为0
    if (Math.abs(n) < epsilon) {
        return 0;
    }

    // 限制极大值
    if (Math.abs(n) > maxValue) {
        console.warn(`⚠️ 检测到异常大数值: ${n}，已限制为 ${Math.sign(n) * maxValue}`);
        return Math.sign(n) * maxValue;
    }

    // 舍入到合理精度
    return Math.round(n * 100000) / 100000;
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

    // 将 data_point 的分量转换为数值或保持原表达式
    function toNumberOrKeep(v: any): any {
        if (typeof v === "string") {
            const trimmed = v.trim();
            if (trimmed.length === 0) return 0;
            if (isFloat(trimmed)) {
                const num = parseFloat(trimmed);
                return cleanNumber(num);
            }
            return v;
        }
        if (isFloat(v)) {
            const num = parseFloat(v);
            return cleanNumber(num);
        }
        return v;
    }

    function vectorFromPoint(p: any): [any, any, any] {
        return [toNumberOrKeep(p?.x ?? 0), toNumberOrKeep(p?.y ?? 0), toNumberOrKeep(p?.z ?? 0)];
    }

    function mapVectorByChannel(channel: string, vec: [any, any, any]): [any, any, any] {
        if (channel === "rotation") {
            const x = toNumberOrKeep(vec[0]);
            const y = toNumberOrKeep(vec[1]);
            const z = toNumberOrKeep(vec[2]);
            return [
                typeof x === 'number' ? cleanNumber(x * -1) : x,
                typeof y === 'number' ? cleanNumber(y * -1) : y,
                z
            ];
        }
        if (channel === "position") {
            const x = toNumberOrKeep(vec[0]);
            const y = toNumberOrKeep(vec[1]);
            const z = toNumberOrKeep(vec[2]);
            return [
                typeof x === 'number' ? cleanNumber(x * -1) : x,
                y,
                z
            ];
        }
        // scale 或其他通道保持不变
        return [toNumberOrKeep(vec[0]), toNumberOrKeep(vec[1]), toNumberOrKeep(vec[2])];
    }

    function simplifyBoneChannels(boneData: Record<string, any>): void {
        // 仅当通道只有 t=0 且为线性数组时，简化为直接数组
        for (const channelKey of Object.keys(boneData)) {
            const channelVal = boneData[channelKey];
            if (channelVal && typeof channelVal === "object" && !Array.isArray(channelVal)) {
                const timeKeys = Object.keys(channelVal);
                if (timeKeys.length === 1 && (timeKeys[0] === "0" || timeKeys[0] === "0.0")) {
                    const single = channelVal[timeKeys[0]];
                    if (Array.isArray(single)) {
                        boneData[channelKey] = single;
                    }
                }
            }
        }
    }

    function sortTimeKeyedMap<T extends Record<string, any>>(map: T): T {
        if (!map || typeof map !== "object" || Array.isArray(map)) return map;
        const keys = Object.keys(map);
        // 若已经被简化为数组，则直接返回
        if (keys.length === 0) return map;
        const sorted = {} as T;
        keys
            .sort((a, b) => parseFloat(a) - parseFloat(b))
            .forEach((k) => {
                (sorted as any)[k] = (map as any)[k];
            });
        return sorted;
    }

    function sortBoneData(boneData: Record<string, any>): void {
        for (const channelKey of Object.keys(boneData)) {
            const channelVal = boneData[channelKey];
            if (channelVal && typeof channelVal === "object" && !Array.isArray(channelVal)) {
                boneData[channelKey] = sortTimeKeyedMap(channelVal);
            }
        }
    }

    // 统一时间键格式，避免整数键触发对象属性的数组索引排序规则
    function formatTimeKey(t: number): string {
        const cleaned = cleanNumber(t);
        if (Number.isInteger(cleaned)) {
            return cleaned.toFixed(1); // 例如 0 -> "0.0"
        }
        let out = cleaned.toFixed(5); // 保留 5 位，随后去尾零
        out = out.replace(/0+$/, "");
        if (out.endsWith(".")) out += "0"; // 确保有小数位
        return out;
    }

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

                // 按通道分组关键帧
                const keyframesByChannel: Record<string, any[]> = {};
                for (const keyframe of keyframes) {
                    const channel = keyframe.channel || "";
                    if (!keyframesByChannel[channel]) {
                        keyframesByChannel[channel] = [];
                    }
                    keyframesByChannel[channel].push(keyframe);
                }

                // 对每个通道的关键帧按时间排序
                for (const channel in keyframesByChannel) {
                    keyframesByChannel[channel].sort((a, b) => (a.time || 0) - (b.time || 0));
                }

                // 处理每个通道的关键帧
                for (const channel in keyframesByChannel) {
                    const channelKeyframes = keyframesByChannel[channel];

                    for (let i = 0; i < channelKeyframes.length; i++) {
                        const keyframe = channelKeyframes[i];
                        const time = keyframe.time || 0;
                        const dataPoints = keyframe.data_points || [];
                        const interpolation = keyframe.interpolation || "linear";

                        if (dataPoints.length > 0) {
                            const vectors = dataPoints.map((dp: any) => vectorFromPoint(dp));
                            const mapped = vectors.map((v: [any, any, any]) => mapVectorByChannel(channel, v));

                            let fillin: any;
                            if (interpolation === "linear") {
                                // 线性：直接使用映射后的第一个向量
                                fillin = mapped[0];
                                if (!boneData[channel]) {
                                    boneData[channel] = {};
                                }
                                boneData[channel][formatTimeKey(time)] = fillin;
                            } else if (interpolation === "catmullrom") {
                                // Catmull-Rom：使用 pre/post 两个切线，若缺失 post 则回退为 pre
                                const pre = mapped[0] ?? [0, 0, 0];
                                const post = mapped[1] ?? pre;
                                fillin = {
                                    pre,
                                    post,
                                    lerp_mode: "catmullrom"
                                };
                                if (!boneData[channel]) {
                                    boneData[channel] = {};
                                }
                                boneData[channel][formatTimeKey(time)] = fillin;
                            } else if (interpolation === "step") {
                                // Step：在下一帧时间点输出 {pre: 当前帧值, post: 下一帧值}
                                const currentValue = mapped[0];
                                const nextKeyframe = channelKeyframes[i + 1];

                                if (nextKeyframe) {
                                    const nextTime = nextKeyframe.time || 0;
                                    const nextDataPoints = nextKeyframe.data_points || [];

                                    if (nextDataPoints.length > 0) {
                                        const nextVectors = nextDataPoints.map((dp: any) => vectorFromPoint(dp));
                                        const nextMapped = nextVectors.map((v: [any, any, any]) => mapVectorByChannel(channel, v));
                                        const nextValue = nextMapped[0];

                                        fillin = {
                                            pre: currentValue,
                                            post: nextValue
                                        };

                                        if (!boneData[channel]) {
                                            boneData[channel] = {};
                                        }
                                        boneData[channel][formatTimeKey(nextTime)] = fillin;
                                    }
                                }
                            }
                        }
                    }
                }

                if (Object.keys(boneData).length > 0) {
                    simplifyBoneChannels(boneData);
                    sortBoneData(boneData);
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
                            particleEffects[formatTimeKey(time)] = dataPoints;
                        }
                    } else if (channel === "sound") {
                        const dataPoints = (keyframe.data_points || [])
                            .map((dp: any) => ({
                                effect: dp.effect || ""
                            }))
                            .filter((dp: any) => dp.effect);

                        if (dataPoints.length > 0) {
                            soundEffects[formatTimeKey(time)] = dataPoints;
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
            outputAnimations[name].particle_effects = sortTimeKeyedMap(particleEffects);
        }
        if (Object.keys(soundEffects).length > 0) {
            outputAnimations[name].sound_effects = sortTimeKeyedMap(soundEffects);
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
 * @param force 是否强制部署所有文件（忽略部署状态）
 */
export function setupBbmodels(force: boolean = false): void {
    console.log(`开始处理bbmodel文件... ${force ? '（强制全部部署）' : '（增量部署）'}`);
    console.log('='.repeat(60));

    const bbmodelFiles = listBbmodelFiles();
    const ignores: string[] = [];
    const deployState = loadDeployState();

    let totalFiles = 0;
    let deployedFiles = 0;
    let skippedFiles = 0;

    for (const bbmodelFile of bbmodelFiles) {
        totalFiles++;
        const basename = path.basename(bbmodelFile, '.bbmodel');

        if (ignores.includes(basename)) {
            console.log(`⏭️  忽略文件: ${basename}`);
            continue;
        }

        // 先执行 setupBasic（这个总是需要执行以保证基本信息正确）
        setupBasic(bbmodelFile);

        // 检查是否需要部署
        if (needsDeploy(bbmodelFile, deployState, force)) {
            console.log(`🚀 部署: ${basename}`);
            deployBbmodel(bbmodelFile);
            updateDeployState(bbmodelFile, deployState);
            deployedFiles++;
        } else {
            skippedFiles++;
        }
    }

    // 保存部署状态
    saveDeployState(deployState);

    // 生成配置文件（总是需要）
    setupBbmodelJson();

    console.log('\n' + '='.repeat(60));
    console.log('处理完成！');
    console.log(`总计: ${totalFiles} 个文件`);
    console.log(`已部署: ${deployedFiles} 个文件`);
    console.log(`已跳过: ${skippedFiles} 个文件`);
    console.log('='.repeat(60));
}

// 如果直接运行此文件
if (require.main === module) {
    // 检查命令行参数
    const args = process.argv.slice(2);
    const force = args.includes('--force') || args.includes('-f');

    if (force) {
        console.log('💪 检测到 --force 参数，将强制部署所有文件\n');
    }

    setupBbmodels(force);
}