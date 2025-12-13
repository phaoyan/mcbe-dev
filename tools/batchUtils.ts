import { BBMODEL_JSON, NAME_SPACE } from "./utils";

export const getBbmodelByAnimationId = (animationId: string) => {
    return animationId.split('.')[2];
}

export const getAnimationFpp = (animationId: string) => {
    return animationId.split('.')[2].endsWith('_fpp');
}

export const getAnimations = (bbmodels: string[]): string[] => {
    let animations = {};
    for (const bbmodel of bbmodels) {
        const bbmodelData = BBMODEL_JSON[bbmodel];
        animations = {
            ...animations,
            ...bbmodelData.animations
        };
    }
    return Object.values(animations);
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
    console.warn(`没有找到动画: ${keywords.join(', ')} 在 ${bbmodels.join(', ')} 中`)
}