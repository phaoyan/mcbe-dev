import { BBMODEL_JSON, client_entity, NAME_SPACE } from "../utils";

const fillArray = (array: any[], length: number) => {
    return Array.from({ length }, (_, index) => array[Math.min(index, array.length - 1)]);
}

export const rpMob = (bbmodel: string, params?: { 
    typeId?: string
    animationController?: string 
    walkThreshold?: number
    runThreshold?: number
    extraAnimate?: string[]
}) => {
    const typeId = params?.typeId ?? bbmodel;
    const bbmodelConfig = BBMODEL_JSON[bbmodel] || {};
    const geometry = bbmodelConfig.geometry || "";
    const textures = bbmodelConfig.textures || [];
    const animations = bbmodelConfig.animations || {};
    const particleEffects = bbmodelConfig.particle_effects || {};
    const soundEffects = bbmodelConfig.sound_effects || {};

    const hasIdle = Object.keys(animations).includes("idle");
    const hasWalk = Object.keys(animations).includes("walk");
    const hasRun = Object.keys(animations).includes("run");

    const ac = params?.animationController ?? (
        hasIdle && hasWalk && hasRun ? "controller.animation.minecraft_dev.idle_walk_run" :
        hasIdle && hasWalk ? "controller.animation.minecraft_dev.idle_walk" :
        hasIdle ? "controller.animation.minecraft_dev.idle" :
        "controller.animation.minecraft_dev.idle"
    )
    

    return {
        format_version: "1.21.10",
        [client_entity]: {
            description: {
                identifier: `${NAME_SPACE}:${typeId}`,
                geometry: {
                    default: `geometry.${geometry}`
                },
                textures: {
                    default: `textures/${NAME_SPACE.replace('_', '/')}/entity/${textures[0]}`
                },
                materials: {
                    default: "entity_alphatest"
                },
                render_controllers: [
                    "controller.render.default"
                ],
                spawn_egg: {
                    texture: bbmodel
                },
                animations: {
                    ...animations,
                    ctrl: ac
                },
                scripts: {
                    initialize: [
                        `v.walk_threshold = ${params?.walkThreshold ?? 0.1};`,
                        `v.run_threshold = ${params?.runThreshold ?? 0.35};`,
                    ],
                    animate: ["ctrl", ...(params?.extraAnimate ?? [])]
                },
                ...(Object.keys(particleEffects).length > 0 && { particle_effects: particleEffects }),
                ...(Object.keys(soundEffects).length > 0 && { sound_effects: soundEffects })
            }
        }
    };
};

export const rpMobWithSkin = (bbmodel: string, params?: { 
    animationController?: string 
    walkThreshold?: number
    runThreshold?: number
}) => {
    const bbmodelConfig = BBMODEL_JSON[bbmodel] || {};
    const textures = bbmodelConfig.textures || [];
    const mob: any = rpMob(bbmodel, params);
    mob["minecraft:client_entity"].description["textures"] = {
        ...mob["minecraft:client_entity"].description["textures"],
        ...(Object.fromEntries((fillArray(textures, 10)).map((texture: string, index: number) => [`skin_${index}`, `textures/${NAME_SPACE.replace('_', '/')}/entity/${texture}`])) as Record<string, string>)
    }
    mob["minecraft:client_entity"].description.render_controllers = [
        "controller.render.skin"
    ]
    return mob;
}