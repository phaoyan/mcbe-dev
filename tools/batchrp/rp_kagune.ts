import { comboAnimationAtts, comboAnimationFpps, idleAnimationAtt, idleAnimationFpp, kaguneCombos } from "../data";
import { NAME_SPACE } from "../utils"

export const rpKaguneSkill = (
    typeId: string, 
    idle: string,
    combos: string[],
    skills: string[],
)=>{
    const animations = (() => {
        const slots: Record<string, string> = {};
        for (let i = 1; i <= 20; i++) {
            slots[`slot${i}_fpp`] = "animation.minecraft_dev.common.none";
        }
        return slots;
    })();
    const skillAnimations = skills.map(skill => `animation.${NAME_SPACE}.${skill}_fpp.skill_fpp`);
    [...combos, ...skillAnimations].forEach((animation, index) => {
        animations[`slot${index + 1}_fpp`] = animation;
    });
    return {
        "format_version": "1.21.10",
        "minecraft:attachable": {
            "description": {
                "identifier": `${NAME_SPACE}:kagune_skill_${typeId}`,
                "textures": {
                    ...skills.reduce((acc: any, skill) => {
                        acc[`${skill}_fpp`] = `textures/${NAME_SPACE.replace('_', '/')}/entity/${skill}_fpp_0`;
                        return acc;
                    }, {}),
                },
                "geometry": {
                    ...skills.reduce((acc: any, skill) => {
                        acc[`${skill}_fpp`] = `geometry.${NAME_SPACE}.${skill}_fpp`;
                        return acc;
                    }, {}),
                },
                "materials": {
                    "default": "entity_alphatest"
                },
                "render_controllers": [
                    ...skills.map(skill => ({ [`controller.render.${skill}_fpp`]: `c.is_first_person && query.is_item_name_any('slot.armor.chest', '${NAME_SPACE}:kagune_armor_${skill}')` })),
                ],
                "animations": {
                    "ctrl": "controller.animation.minecraft_dev.player.script_driven_fpp",
                    "idle_fpp": idle,
                    ...animations,
                },
                "scripts": {
                    "parent_setup": "t.slot = v.slot ?? 0;",
                    "animate": [
                        "ctrl"
                    ]
                }
            }
        }
    }
}

export const rpKaguneArmor = (
    typeId: string, 
    idle: string,
    combos: string[],
    skills: string[],
)=>{
    const animations = (() => {
        const slots: Record<string, string> = {};
        for (let i = 1; i <= 20; i++) {
            slots[`slot${i}`] = "animation.minecraft_dev.common.none";
        }
        return slots;
    })()

    const skillAnimations = skills.map(skill => `animation.${NAME_SPACE}.${skill}.skill_att`);
    [...combos, ...skillAnimations].forEach((animation, index) => {
        animations[`slot${index + 1}`] = animation;
    })

    return {
        "format_version": "1.21.10",
        "minecraft:attachable": {
            "description": {
                "identifier": `${NAME_SPACE}:kagune_armor_${typeId}`,
                "textures": {
                    "default": `textures/${NAME_SPACE.replace('_', '/')}/entity/${typeId}_0`
                },
                "geometry": {
                    "default": `geometry.${NAME_SPACE}.${typeId}`
                },
                "materials": {
                    "default": "entity_alphatest"
                },
                "render_controllers": [
                    {
                        "controller.render.default": "!c.is_first_person && !(t.invisible ?? 0)"
                    }
                ],
                "animations": {
                    "ctrl": "controller.animation.minecraft_dev.player.script_driven",
                    "idle": idle,
                    ...animations,
                },
                "scripts": {
                    "parent_setup": "t.slot = v.slot ?? 0; t.invisible = v.invisible ?? 0;",
                    "animate": [
                        "ctrl"
                    ]
                }
            }
        }
    }
}

export const rpKaguneRc = (typeIds: string[])=>{
    return {
        "format_version": "1.10.0",
        "render_controllers": Object.fromEntries(typeIds.map(typeId=>([
            `controller.render.${typeId}_fpp`, {
                "geometry": `geometry.${typeId}_fpp`,
                "materials": [
                    {
                        "*": "material.default"
                    }
                ],
                "textures": [
                    `texture.${typeId}_fpp`
                ]
            }
        ])))
    }
}

const combos = kaguneCombos
export const rpKaguneArmorGroup = (typeIds: string[])=>{
    return typeIds.map(typeId => ({
        typeId: typeId,
        data: rpKaguneArmor(typeId, idleAnimationAtt(combos[typeId]), comboAnimationAtts(combos[typeId]), typeIds)
    }))
}
export const rpKaguneSkillGroup = (typeIds: string[])=>{
    return typeIds.map(typeId => ({
        typeId: typeId,
        data: rpKaguneSkill(typeId, idleAnimationFpp(combos[typeId]), comboAnimationFpps(combos[typeId]), typeIds)
    }))
}