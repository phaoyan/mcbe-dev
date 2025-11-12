import { BBMODEL_JSON, NAME_SPACE } from "../utils"


export const rpQuinque = (bbmodelTpp: string, bbmodelFpp: string, typeId: string)=>{
    const bbmodelConfigTpp = BBMODEL_JSON[bbmodelTpp] || {};
    const bbmodelConfigFpp = BBMODEL_JSON[bbmodelFpp] || {};
    const geometryTpp = bbmodelConfigTpp.geometry || "";
    const geometryFpp = bbmodelConfigFpp.geometry || "";
    const texturesTpp = bbmodelConfigTpp.textures || [];
    const texturesFpp = bbmodelConfigFpp.textures || [];
    const animationsFpp = bbmodelConfigFpp.animations || {};
    const animationsTpp = bbmodelConfigTpp.animations || {};

    const slotFpps = (() => {
        const slots: Record<string, string> = {};
        for (let i = 1; i <= 20; i++) {
            slots[`slot${i}_fpp`] = "animation.minecraft_dev.common.none";
        }
        return slots;
    })();

    const slotTpps = (() => {
        const slots: Record<string, string> = {};
        for (let i = 1; i <= 20; i++) {
            slots[`slot${i}`] = "animation.minecraft_dev.common.none";
        }
        return slots;
    })();

    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "materials": {
                    "default": "entity_alphatest"
                },
                "textures": {
                    "tpp": `textures/${NAME_SPACE.replace('_', '/')}/entity/${texturesTpp[0]}`,
                    "fpp": `textures/${NAME_SPACE.replace('_', '/')}/entity/${texturesFpp[0]}`
                },
                "render_controllers": [
                    {
                        "controller.render.tpp": "!c.is_first_person"
                    },
                    {
                        "controller.render.fpp": "c.is_first_person"
                    }
                ],
                "geometry": {
                    "tpp": `geometry.${geometryTpp}`,
                    "fpp": `geometry.${geometryFpp}`
                },
                "scripts": {
                    "parent_setup": "t.slot = v.slot ?? 0;",
                    "animate": [
                        {
                            "ctrl_fpp": "c.is_first_person"
                        },
                        {
                            "ctrl": "!c.is_first_person"
                        }
                    ]
                },
                "animations": {
                    "ctrl": "controller.animation.minecraft_dev.player.script_driven",
                    "ctrl_fpp": "controller.animation.minecraft_dev.player.script_driven_fpp",
                    ...slotFpps,
                    ...slotTpps,
                    "idle_fpp": animationsFpp.idle_fpp,
                    "slot1_fpp": animationsFpp.skill_fpp,
                    "idle": animationsTpp.idle_att,
                    "slot1": animationsTpp.skill_att,
                },
            }
        }
    }
}