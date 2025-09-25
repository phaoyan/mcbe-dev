import { NAME_SPACE } from "../utils"

export const bpArmor = (typeId: string, slot: string) => {
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
                "minecraft:wearable": {
                    "slot": `slot.armor.${slot}`
                },
                "minecraft:icon": `${typeId}`,
                "minecraft:max_stack_size": 1
            }
        }
    }
}