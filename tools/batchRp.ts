import * as path from 'path';
import {
    NAME_SPACE,
    RESOURCE_PACK_DIR,
    BBMODEL_JSON_PATH,
    writeJson,
    readJson,
    ensureDir
} from './utils';
import animationIds from '../scripts/json/animation_ids.json';

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
const BBMODEL_JSON = readJson(BBMODEL_JSON_PATH);

const setupEntity = (bbmodel: string) => {
    const bbmodelConfig = BBMODEL_JSON[bbmodel] || {};
    const geometry = bbmodelConfig.geometry || "";
    const textures = bbmodelConfig.textures || [];
    const animations = bbmodelConfig.animations || {};
    const particleEffects = bbmodelConfig.particle_effects || {};
    const soundEffects = bbmodelConfig.sound_effects || {};

    return {
        "format_version": "1.21.10",
        "minecraft:client_entity": {
            "description": {
                "identifier": `${NAME_SPACE}:${bbmodel}`,
                "geometry": {
                    "default": `geometry.${geometry}`
                },
                "textures": {
                    "default": `textures/entity/${textures[0]}`
                },
                "materials": {
                    "default": "entity_alphatest"
                },
                "render_controllers": [
                    "controller.render.default"
                ],
                ...(Object.keys(animations).length > 0 && { "animations": animations }),
                ...(Object.keys(particleEffects).length > 0 && { "particle_effects": particleEffects }),
                ...(Object.keys(soundEffects).length > 0 && { "sound_effects": soundEffects })
            }
        }
    };
};

const setupMobs = (bbmodel: string, animationController: string) => {
    const bbmodelConfig = BBMODEL_JSON[bbmodel] || {};
    const geometry = bbmodelConfig.geometry || "";
    const textures = bbmodelConfig.textures || [];
    const animations = bbmodelConfig.animations || {};
    const particleEffects = bbmodelConfig.particle_effects || {};
    const soundEffects = bbmodelConfig.sound_effects || {};

    return {
        "format_version": "1.21.10",
        "minecraft:client_entity": {
            "description": {
                "identifier": `${NAME_SPACE}:${bbmodel}`,
                "geometry": {
                    "default": `geometry.${geometry}`
                },
                "textures": {
                    "default": `textures/entity/${textures[0]}`
                },
                "materials": {
                    "default": "entity_alphatest"
                },
                "render_controllers": [
                    "controller.render.default"
                ],
                "animations": {
                    ...animations,
                    "ctrl": animationController
                },
                "scripts": {
                    "animate": ["ctrl"]
                },
                ...(Object.keys(particleEffects).length > 0 && { "particle_effects": particleEffects }),
                ...(Object.keys(soundEffects).length > 0 && { "sound_effects": soundEffects })
            }
        }
    };
};

const setupAttachable = (typeId: string, bbmodelTpp: string, bbmodelFpp: string) => {
    const bbmodelTppConfig = BBMODEL_JSON[bbmodelTpp] || {};
    const bbmodelFppConfig = BBMODEL_JSON[bbmodelFpp] || {};

    const geometryTpp = bbmodelTppConfig.geometry || "";
    const geometryFpp = bbmodelFppConfig.geometry || "";
    const texturesTpp = bbmodelTppConfig.textures || [];
    const texturesFpp = bbmodelFppConfig.textures || [];
    const animationsTpp = bbmodelTppConfig.animations || {};
    const animationsFpp = bbmodelFppConfig.animations || {};

    return {
        "format_version": "1.21.10",
        "minecraft:attachable": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "textures": {
                    "tpp": `textures/entity/${texturesTpp[0]}`,
                    "fpp": `textures/entity/${texturesFpp[0]}`
                },
                "geometry": {
                    "tpp": `geometry.${geometryTpp}`,
                    "fpp": `geometry.${geometryFpp}`
                },
                "materials": {
                    "default": "entity_alphatest"
                },
                "render_controllers": [
                    {
                        "controller.render.tpp": "!c.is_first_person"
                    },
                    {
                        "controller.render.fpp": "c.is_first_person"
                    }
                ],
                "animations": {
                    ...animationsFpp,
                    ...animationsTpp
                },
                "scripts": {
                    "parent_setup": "t.player_attacking = v.attack_time; t.is_using_item = q.is_using_item;"
                }
            }
        }
    };
};

const setupCombo = (params: {
    typeId: string;
    bbmodelTpp: string;
    bbmodelFpp: string;
    comboFpps: string[];
    comboTpps: string[];
    idleFpp: string;
    idleTpp: string;
    trigger: boolean; // true for lclick, false for rclick
    comboMax: number;
}) => {
    return {
        "format_version": "1.21.10",
        "minecraft:attachable": {
            "description": {
                "identifier": `${NAME_SPACE}:${params.typeId}`,
                "textures": {
                    "tpp": `textures/entity/${params.bbmodelTpp}_0`,
                    "fpp": `textures/entity/${params.bbmodelFpp}_0`
                },
                "geometry": {
                    "tpp": `geometry.${NAME_SPACE}.${params.bbmodelTpp}`,
                    "fpp": `geometry.${NAME_SPACE}.${params.bbmodelFpp}`
                },
                "materials": {
                    "default": "entity_alphatest"
                },
                "render_controllers": [
                    {
                        "controller.render.tpp": "!c.is_first_person"
                    },
                    {
                        "controller.render.fpp": "c.is_first_person"
                    }
                ],
                "animations": {
                    "ctrl": "controller.animation.combo",
                    "combo1_fpp": params.comboFpps[Math.min(0, params.comboMax - 1)],
                    "combo1_tpp": params.comboTpps[Math.min(0, params.comboMax - 1)],
                    "combo2_fpp": params.comboFpps[Math.min(1, params.comboMax - 1)],
                    "combo2_tpp": params.comboTpps[Math.min(1, params.comboMax - 1)],
                    "combo3_fpp": params.comboFpps[Math.min(2, params.comboMax - 1)],
                    "combo3_tpp": params.comboTpps[Math.min(2, params.comboMax - 1)],
                    "combo4_fpp": params.comboFpps[Math.min(3, params.comboMax - 1)],
                    "combo4_tpp": params.comboTpps[Math.min(3, params.comboMax - 1)],
                    "combo5_fpp": params.comboFpps[Math.min(4, params.comboMax - 1)],
                    "combo5_tpp": params.comboTpps[Math.min(4, params.comboMax - 1)],
                    "combo6_fpp": params.comboFpps[Math.min(5, params.comboMax - 1)],
                    "combo6_tpp": params.comboTpps[Math.min(5, params.comboMax - 1)],
                    "combo7_fpp": params.comboFpps[Math.min(6, params.comboMax - 1)],
                    "combo7_tpp": params.comboTpps[Math.min(6, params.comboMax - 1)],
                    "combo8_fpp": params.comboFpps[Math.min(7, params.comboMax - 1)],
                    "combo8_tpp": params.comboTpps[Math.min(7, params.comboMax - 1)],
                    "combo9_fpp": params.comboFpps[Math.min(8, params.comboMax - 1)],
                    "combo9_tpp": params.comboTpps[Math.min(8, params.comboMax - 1)],
                    "combo10_fpp": params.comboFpps[Math.min(9, params.comboMax - 1)],
                    "combo10_tpp": params.comboTpps[Math.min(9, params.comboMax - 1)],
                    "idle_fpp": params.idleFpp,
                    "idle_tpp": params.idleTpp
                },
                "scripts": {
                    "parent_setup": "t.player_attacking = v.attack_time; t.is_using_item = q.is_using_item;",
                    "animate": [
                        "ctrl"
                    ],
                    "pre_animation": [
                        `v.combo_max = ${params.comboMax};`,
                        `v.trigger = ${params.trigger ? 1 : 0};`
                    ]
                }
            }
        }
    };
};
/**
 * 主函数
 */
export async function main(): Promise<void> {
    const comboData = setupCombo({
        typeId: "combo",
        bbmodelTpp: "player",
        bbmodelFpp: "player_fpp",
        comboFpps: [
            animationIds.minecraft_dev.player_fpp.combo1,
            animationIds.minecraft_dev.player_fpp.combo2,
            animationIds.minecraft_dev.player_fpp.combo3
        ],
        comboTpps: [
            animationIds.minecraft_dev.player.combo1,
            animationIds.minecraft_dev.player.combo2,
            animationIds.minecraft_dev.player.combo3
        ],
        idleFpp: animationIds.minecraft_dev.player_fpp.idle,
        idleTpp: animationIds.minecraft_dev.player.idle,
        trigger: true,
        comboMax: 3,
    });
    exportData(comboData, "combo");

    const entityData = setupEntity("lclick_dummy");
    exportData(entityData, "dummy/lclick_dummy");
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}