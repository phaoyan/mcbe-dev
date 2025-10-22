import { NAME_SPACE } from "../utils";

export const bpRclick = (typeId: string, cd: number) => {
    return {
        "format_version": "1.21.10",
        "minecraft:item": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`
            },
            "components": {
                "minecraft:icon": `${NAME_SPACE}:${typeId}`,
                "minecraft:food": {
                    "can_always_eat": true,
                    "nutrition": 0,
                    "saturation_modifier": 0.0
                },
                "minecraft:cooldown": {
                    "category": `${NAME_SPACE}:${typeId}`,
                    "duration": cd
                },
                "minecraft:use_modifiers": {
                    "use_duration": 9999999,
                    "movement_modifier": 1
                },
                "minecraft:can_destroy_in_creative": false
            }
        }
    };
};  