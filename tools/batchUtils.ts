import { BBMODEL_JSON, NAME_SPACE } from "./utils";

export const getBbmodelByAnimationId = (animationId: string) => {
    return animationId.replace('animation.', '').replace(`${NAME_SPACE}.`, '').split('.')[0];
}

export const getAnimations = (bbmodels: string[]): Record<string, string> => {
    let animations = {};
    for (const bbmodel of bbmodels) {
        const bbmodelData = BBMODEL_JSON[bbmodel];
        animations = {
            ...animations,
            ...bbmodelData.animations
        };
    }
    return animations;
}

export const findAnimation = (bbmodels: string[], keywords: string[]): string | undefined =>{
    for (const bbmodel of bbmodels) {
        const bbmodelData = BBMODEL_JSON[bbmodel];
        const animations = bbmodelData.animations;
        for (const animation of Object.values(animations)) {
            if (typeof animation !== 'string') continue;
            if (keywords.every(keyword => animation.includes(keyword))) {
                return animation;
            }
        }
    }
}