import ref from "../../scripts/refs/ref";
import { getBbmodelByAnimationId } from "../batchUtils";
import { BBMODEL_JSON, NAME_SPACE } from "../utils"
import { SLOT_COUNT } from "./ac_att";

export interface AttData {
    typeId: string,
    skills: { att?: string, fpp?: string, eff?: string }[],
    basics: {
        idleAtt: string,
        idleFpp: string,
        walkAtt?: string,
        walkFpp?: string,
    },
}

export const rpAtt = (data: AttData) => {
    const { typeId, basics, skills } = data;
    const { idleAtt, idleFpp, walkAtt = idleAtt, walkFpp = idleFpp } = basics;
    const slotAnimations = {
        ctrl_fpp: "controller.animation.minecraft_dev.player.fpp",
        ctrlskill_att: "controller.animation.minecraft_dev.player.skill.att",
        ctrlmove_att: "controller.animation.minecraft_dev.player.move.att",
        idle_fpp: idleFpp,
        idle_att: idleAtt,
        walk_fpp: walkFpp,
        walk_att: walkAtt,
        ...Array.from({length: SLOT_COUNT}, (_, i) => ({[`slot${i+1}_fpp`]: "animation.minecraft_dev.common.none"})).reduce((acc, curr) => ({...acc, ...curr}), {}),
        ...Array.from({length: SLOT_COUNT}, (_, i) => ({[`slot${i+1}_att`]: "animation.minecraft_dev.common.none"})).reduce((acc, curr) => ({...acc, ...curr}), {}),
        void: ref.animation_tree.minecraft_dev.common.void,
    }
    const maxSkillSlots = Math.min(skills.length, SLOT_COUNT);
    for (let i = 0; i < maxSkillSlots; i++) {
        const { fpp, att } = skills[i] ?? {};
        if (fpp) slotAnimations[`slot${i+1}_fpp` as keyof typeof slotAnimations] = fpp;
        if (att) slotAnimations[`slot${i+1}_att` as keyof typeof slotAnimations] = att;
    }

    const skillAnims = skills
        .flatMap(s => [s?.fpp, s?.att])
        .filter((v): v is string => typeof v === "string" && v.length > 0);

    const textures: Record<string, string> = {};
    skillAnims.forEach((anim) => {
        const bbmodelId = getBbmodelByAnimationId(anim);
        const bbmodel = BBMODEL_JSON[bbmodelId];
        if (!bbmodel) return
        textures[bbmodelId] = `textures/${NAME_SPACE.replace('_', '/')}/entity/${bbmodel.textures[0]}`;
        if (bbmodel.textures.length > 1) {
            bbmodel.textures.forEach((texture: string, idx: number) => {
                textures[`${bbmodelId}_${idx}`] = `textures/${NAME_SPACE.replace('_', '/')}/entity/${texture}`;
            });
        }
    });
    const geometry: Record<string, string> = {};
    skillAnims.forEach((anim) => {
        const bbmodelId = getBbmodelByAnimationId(anim);
        const bbmodel = BBMODEL_JSON[bbmodelId];
        if (!bbmodel) return
        geometry[bbmodelId] = `geometry.${bbmodel.geometry}`;
    });
    const renderControllers: any[] = [];
    const idleFppBbmodel = BBMODEL_JSON[getBbmodelByAnimationId(idleFpp)];
    const idleAttBbmodel = BBMODEL_JSON[getBbmodelByAnimationId(idleAtt)];
    if (idleFppBbmodel) {
        renderControllers.push({
            [`controller.render.${idleFppBbmodel.geometry}`]: `c.is_first_person && t.slot == 0`
        });
    }
    if (idleAttBbmodel) {
        renderControllers.push({
            [`controller.render.${idleAttBbmodel.geometry}`]: `!t.invisible && !c.is_first_person && t.slot == 0`
        });
    }

    for (let i = 0; i < maxSkillSlots; i++) {
        const { fpp, att } = skills[i] ?? {};

        if (fpp) {
            const bbmodelId = getBbmodelByAnimationId(fpp);
            const bbmodel = BBMODEL_JSON[bbmodelId];
            if (bbmodel) {
                renderControllers.push({
                    [`controller.render.${bbmodel.geometry}`]: `c.is_first_person && t.slot == ${i+1}`
                });
            }
        }

        if (att) {
            const bbmodelId = getBbmodelByAnimationId(att);
            const bbmodel = BBMODEL_JSON[bbmodelId];
            if (bbmodel) {
                renderControllers.push({
                    [`controller.render.${bbmodel.geometry}`]: `!t.invisible && !c.is_first_person && t.slot == ${i+1}`
                });
            }
        }
    }

    return {
        "format_version": "1.21.10",
        "minecraft:attachable": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "textures": textures,
                "geometry": geometry,
                "materials": {
                    "default": "entity_alphatest",
                    "alphablend": "entity_alphablend",
                    "alphatest": "entity_alphatest",
                },
                "render_controllers": renderControllers,
                "animations": slotAnimations,
                "scripts": {
                    "initialize": [
                        "v.slot = 0;",
                    ],
                    "parent_setup": "t.slot = v.slot ?? 0; t.invisible = v.invisible ?? 0;",
                    "animate": [
                        {"ctrl_fpp": "c.is_first_person"},
                        {"ctrlmove_att": "!c.is_first_person"},
                        {"ctrlskill_att": "!c.is_first_person"},
                    ]
                }
            }
        }
    }
}

export const rpRc = (bbmodelId: string, anim?: { fps?: number, maxFrame: number }) => {
    let rc = {

    }
    if (!anim)  {
        rc = {
            [`controller.render.${NAME_SPACE}.${bbmodelId}`]: {
                "geometry": `geometry.${bbmodelId}`,
                "materials": [
                    {
                        "*": "material.alphatest"
                    },
                    {
                        "alphablend_*": "material.alphablend"
                    },
                    {
                        "alphatest_*": "material.alphatest"
                    }
                ],
                "textures": [
                    `texture.${bbmodelId}`
                ]
            }
        }
    } else {
        rc = {
            [`controller.render.${NAME_SPACE}.${bbmodelId}`]: {
                "arrays": {
                    "textures": {
                        "array.tex": Array.from({length: anim.maxFrame}, (_, i) => `texture.${bbmodelId}_${i}`)
                    }
                },
                "geometry": `geometry.${bbmodelId}`,
                "materials": [
                    {
                        "*": "material.anim_alphatest"
                    },
                    {
                        "alphablend_*": "material.alphablend"
                    },
                    {
                        "alphatest_*": "material.alphatest"
                    }
                ],
                "textures": [`array.tex[math.mod(math.floor(q.life_time * ${anim.fps ?? 10}), ${anim.maxFrame})]`],
            }
        }
    }

    return {
        "format_version": "1.10.0",
        "render_controllers": {
            ...rc
        }     
    }
}