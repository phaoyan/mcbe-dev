import { BBMODEL_JSON, client_entity, NAME_SPACE } from "../utils";

export const rpEffect = (bbmodel: string) => {
    const bbmodelConfig = BBMODEL_JSON[bbmodel] || {};
    const geometry = bbmodelConfig.geometry || "";
    const textures = bbmodelConfig.textures || [];
    const animations = bbmodelConfig.animations || {};
    const particleEffects = bbmodelConfig.particle_effects || {};
    const soundEffects = bbmodelConfig.sound_effects || {};

    return {
        format_version: "1.21.10",
        [client_entity]: {
            description: {
                identifier: `${NAME_SPACE}:${bbmodel}`,
                geometry: {
                    default: `geometry.${geometry}`
                },
                textures: {
                    default: `textures/entity/${textures[0]}`
                },
                materials: {
                    default: "entity_alphatest"
                },
                render_controllers: [
                    "controller.render.default"
                ],
                ...(Object.keys(animations).length > 0 && { animations }),
                ...(Object.keys(particleEffects).length > 0 && { particle_effects: particleEffects }),
                ...(Object.keys(soundEffects).length > 0 && { sound_effects: soundEffects })
            }
        }
    };
};