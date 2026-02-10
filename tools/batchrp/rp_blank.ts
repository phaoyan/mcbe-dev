import { NAME_SPACE } from "../utils"

export const rpBlankItem = (typeId: string) => {
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "materials": {
                    "default": "entity_alphatest"
                },
                "textures": {
                    "default": "textures/ns/ds/empty"   
                },
                "geometry": {
                    "default": "geometry.ns_ds.empty"
                },
                "render_controllers": [
                    {
                        "controller.render.default": "0"
                    }
                ],
                "scripts": {
                    "initialize": [
                        "v.slot = 0;"
                    ],
                    "parent_setup": "t.slot = v.slot ?? 0; t.invisible = v.invisible ?? 0;",
                }
            }
        }
    }
}