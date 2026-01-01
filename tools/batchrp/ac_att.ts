// 配置常量
export const SLOT_COUNT = 20;
const DEFAULT_BLEND_TRANSITION = 0;

// 生成移动控制器
const createMoveController = (suffix: string) => {
    const animSuffix = suffix ? `_${suffix}` : '';
    return {
        states: {
            default: {
                animations: [`idle${animSuffix}`],
                transitions: [
                    {"walk": "q.modified_move_speed >= (t.walk_threshold ?? 0.1)"},
                    {"void": "t.slot != 0"},
                ]
            },
            walk: {
                animations: [`walk${animSuffix}`],
                transitions: [
                    {"default": "q.modified_move_speed < (t.walk_threshold ?? 0.1)"}, 
                    {"void": "t.slot != 0"},
                ]
            },
            void: {
                animations: [`void`],
                transitions: [{"default": "q.any_animation_finished && (t.slot??0) == 0"}]
            }
        }
    };
};

// 生成技能槽状态的转换列表
const generateSlotTransitions = (currentSlot: number, includeDefault: boolean = false) => {
    const transitions = [];
    if (includeDefault) {
        transitions.push({"default": "q.any_animation_finished && (t.slot??0) == 0"});
    }
    for (let i = 1; i <= SLOT_COUNT; i++) {
        if (i !== currentSlot) {
            transitions.push({[`slot${i}`]: `t.slot == ${i}`});
        }
    }
    return transitions;
};

// 生成技能槽控制器
const createSkillController = (suffix?: string, blendTransition?: number) => {
    const animSuffix = suffix ? `_${suffix}` : '';
    const states: Record<string, any> = {
        default: {
            transitions: generateSlotTransitions(0),
            blend_transition: 0.1
        }
    };

    for (let i = 1; i <= SLOT_COUNT; i++) {
        states[`slot${i}`] = {
            animations: [`slot${i}${animSuffix}`],
            transitions: generateSlotTransitions(i, true),
            blend_transition: blendTransition ?? DEFAULT_BLEND_TRANSITION
        };
    }

    return { states };
};

const createFppController = ()=>{
    const states: Record<string, any> = {
        default: {
            animations: [
                { idle_fpp: "q.modified_move_speed < (t.walk_threshold ?? 0.1)" },
                { walk_fpp: "q.modified_move_speed >= (t.walk_threshold ?? 0.1)" }
            ],
            transitions: generateSlotTransitions(0),
            blend_transition: DEFAULT_BLEND_TRANSITION
        }
    };

    for (let i = 1; i <= SLOT_COUNT; i++) {
        states[`slot${i}`] = {
            animations: [`slot${i}_fpp`],
            transitions: generateSlotTransitions(i, true),
            blend_transition:  0
        };
    }

    return { states };
}

export const acAtt = () => {
    return {
        "format_version": "1.10.0",
        "animation_controllers": {
            "controller.animation.minecraft_dev.player.move": createMoveController(''),
            "controller.animation.minecraft_dev.player.move.tpp": createMoveController('tpp'),
            "controller.animation.minecraft_dev.player.move.att": {
                "states": {
                    "default": {
                        "animations": [
                            "idle_att"
                        ],
                        "transitions": [
                            {
                                "walk": "q.modified_move_speed >= (t.walk_threshold ?? 0.1)"
                            },
                            {
                                "skill": "t.slot != 0"
                            }
                        ]
                    },
                    "walk": {
                        "animations": [
                            "walk_att"
                        ],
                        "transitions": [
                            {
                                "default": "q.modified_move_speed < (t.walk_threshold ?? 0.1)"
                            }
                        ]
                    },
                    "skill": {
                        "transitions": [
                            {
                                "default": "t.slot == 0"
                            },
                            {
                                "walk": "q.modified_move_speed >= (t.walk_threshold ?? 0.1)"
                            }
                        ]
                    }
                }
            },
            "controller.animation.minecraft_dev.player.skill": createSkillController(''),
            "controller.animation.minecraft_dev.player.skill.tpp": createSkillController('tpp'),
            "controller.animation.minecraft_dev.player.skill.att": createSkillController('att'),
            "controller.animation.minecraft_dev.player.fpp": createFppController(),
        }
    };
};