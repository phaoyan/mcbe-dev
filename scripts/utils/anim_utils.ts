import { Entity, ItemStack, Player, World } from "@minecraft/server"
import animation_ids from "../json/animation_ids.json"
import { DPUtils } from "./dp_utils"

const ComboAC: AnimCtrl = {
    "controller.animation.player.combo": {
        [animation_ids.minecraft_dev.player.idle]: {
            blendOutTime: .2,
            transitions: [
                {
                    [animation_ids.minecraft_dev.player_fpp.idle]: "v.is_first_person"
                },
                {
                    [animation_ids.minecraft_dev.player.combo1]: "v.attack_time"
                }
            ]
        },
        [animation_ids.minecraft_dev.player_fpp.idle]: {
            blendOutTime: .2,
            transitions: [
                {
                    [animation_ids.minecraft_dev.player.idle]: "!v.is_first_person"
                }
            ]
        },
        [animation_ids.minecraft_dev.player.combo1]: {
            blendOutTime: .2,
            transitions: [
                {
                    [animation_ids.minecraft_dev.player.idle]: "q.any_animation_finished && !v.attack_time"
                },
                {
                    [animation_ids.minecraft_dev.player.combo2]: "q.any_animation_finished && v.attack_time"
                }
            ]
        },
        [animation_ids.minecraft_dev.player.combo2]: {
            blendOutTime: .2,
            transitions: [
                {
                    [animation_ids.minecraft_dev.player.idle]: "q.any_animation_finished && !v.attack_time"
                },
                {
                    [animation_ids.minecraft_dev.player.combo3]: "q.any_animation_finished && v.attack_time"
                }
            ]
        },
        [animation_ids.minecraft_dev.player.combo3]: {
            blendOutTime: .2,
            transitions: [
                {
                    [animation_ids.minecraft_dev.player.idle]: "q.any_animation_finished"
                }
            ]
        },
    },
}

// Player Invert ACs
export const PILegsAC: AnimCtrl = {
    "controller.animation.player.move.legs.reverse": {
        [animation_ids.minecraft_dev.player.move.legs.reverse]: { transitions: [{ [animation_ids.minecraft_dev.common.none]: "0" }] }
    },
}

export const PIArmsAC: AnimCtrl = {
    "controller.animation.player.move.arms.reverse": {
        [animation_ids.minecraft_dev.player.move.arms.reverse]: { transitions: [{ [animation_ids.minecraft_dev.common.none]: "0" }] }
    },
}

export const PIHoldingAC: AnimCtrl = {
    "controller.animation.player.holding.reverse": {
        [animation_ids.minecraft_dev.player.holding.reverse]: { transitions: [{ [animation_ids.minecraft_dev.common.none]: "0" }] }
    },
}

export const PILookAtTargetAC: AnimCtrl = {
    "controller.animation.player.look_at_target.ui.reverse": {
        [animation_ids.minecraft_dev.player.look_at_target.ui.reverse]: { transitions: [{ [animation_ids.minecraft_dev.common.none]: "0" }] }
    },
}

export const PIAttackRotationsAC: AnimCtrl = {
    "controller.animation.player.attack.rotations.reverse": {
        [animation_ids.minecraft_dev.player.attack.rotations.reverse]: { transitions: [{ [animation_ids.minecraft_dev.common.none]: "0" }] }
    },
}


export const PISneakingAC: AnimCtrl = {
    "controller.animation.player.sneaking.reverse": {
        [animation_ids.minecraft_dev.player.sneaking.reverse]: { transitions: [{ [animation_ids.minecraft_dev.common.none]: "!v.is_sneaking" }] },
        [animation_ids.minecraft_dev.common.none]: { transitions: [{ [animation_ids.minecraft_dev.player.sneaking.reverse]: "v.is_sneaking" }] },
    }
}

export type AnimCtrl = {
    [controllerName: string]: {
        [stateName: string]: {
            blendOutTime?: number
            transitions: {
                [key: string]: string
            }[]
        }
    }
}

export class AnimUtils {

    static TARGET_ENTITY: Entity | null = null

    static register(entity: Entity, acs: AnimCtrl) {
        for (let [controllerName, states] of Object.entries(acs)) {
            for (let [state, obj] of Object.entries(states)) {
                for (let transition of obj.transitions) {
                    entity.playAnimation(state, {
                        blendOutTime: obj.blendOutTime ?? 0,
                        controller: controllerName.startsWith("controller.animation") ? controllerName : `controller.animation.${controllerName}`,
                        nextState: Object.keys(transition)[0],
                        stopExpression: transition[Object.keys(transition)[0]]
                    })
                }
            }
        }
    }

    static unregister(entity: Entity, acs: AnimCtrl) {
        for (let controllerName of Object.keys(acs)) {
            entity.playAnimation(animation_ids.minecraft_dev.common.none, {
                controller: controllerName,
                stopExpression: "0",
                nextState: animation_ids.minecraft_dev.common.none
            })
        }
    }
}

export const registerAnimbinds = (animbinds: { [key: string]: AnimCtrl }) => {
    return (target: Entity | ItemStack | World, curr: string, prev: string)=>{
        if (!(target instanceof Player)) return
        if(curr===prev) return
        if(!!prev && Object.keys(animbinds).includes(prev)) {
            AnimUtils.unregister(target, animbinds[prev])
        }
        if(!!curr && Object.keys(animbinds).includes(curr)) {
            AnimUtils.register(target, animbinds[curr])
        }
    }
}

DPUtils.store().player_animation_combo.register(registerAnimbinds({
    combo: {
        ...ComboAC,
        ...PIArmsAC,
        ...PIHoldingAC,
        ...PILookAtTargetAC,
        ...PIAttackRotationsAC,
        ...PISneakingAC,
    }
}))