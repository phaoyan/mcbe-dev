import { NAME_SPACE } from "../utils"

export const bpEntityPlacer = (typeId: string, entityId: string) => {
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
                "minecraft:max_stack_size": 1,
                "minecraft:entity_placer": {
                    "entity": entityId.includes(":") ? entityId : `${NAME_SPACE}:${entityId}`
                }
            }
        }
    }
}