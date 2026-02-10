import { NAME_SPACE } from "../utils"

export const bpItem = (typeId: string, stackSize: number = 64) => {
    return {
        "format_version": "1.21.10",
        "minecraft:item": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "menu_category": {
                    "category": "items"
                }
            },
            "components": {
                "minecraft:icon": `${typeId}`,
                "minecraft:max_stack_size": stackSize
            }
        }
    }
}

export interface FoodData {
    typeId: string,
    nutrition?: number,
    saturation_modifier?: number,
    use_duration?: number,
    movement_modifier?: number
}

export const bpConsumable = (data: FoodData) => {
    return {
        "format_version": "1.21.10",
        "minecraft:item": {
            "description": {
                "identifier": `${NAME_SPACE}:${data.typeId}`,
                "menu_category": {
                    "category": "items"
                }
            },
            "components": {
                "minecraft:food": {
                    "can_always_eat": true,
                    "nutrition": data.nutrition ?? 0,
                    "saturation_modifier": data.saturation_modifier ?? 0
                },
                "minecraft:icon": `${NAME_SPACE}:${data.typeId}`,
                "minecraft:max_stack_size": 64,
                "minecraft:use_animation": "eat",
                "minecraft:use_modifiers": {
                    "use_duration": data.use_duration ?? 1.1,
                    "movement_modifier": data.movement_modifier ?? 0.8
                }
            }
        }
    }
}