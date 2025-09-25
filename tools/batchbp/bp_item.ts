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