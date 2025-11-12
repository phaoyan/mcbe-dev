import { BBMODEL_JSON, NAME_SPACE } from "../utils"


export const rpArmor = (bbmodel: string, typeId?: string) => {
    if (!typeId) typeId = bbmodel;
    const bbmodelConfig = BBMODEL_JSON[bbmodel] || {};
    const geometry = bbmodelConfig.geometry || "";
    const textures = bbmodelConfig.textures || [];
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "materials": {
                    "default": "entity_alphatest"
                },
                "textures": {
                    "default": `textures/${NAME_SPACE.replace('_', '/')}/entity/${textures[0]}`
                },
                "render_controllers": [
                    "controller.render.default"
                ],
                "geometry": {
                    "default": `geometry.${geometry}`
                }
            }
        }
    }
}