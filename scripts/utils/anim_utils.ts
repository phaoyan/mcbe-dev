import { Entity, ItemStack, Player, system, world, World } from "@minecraft/server"
import animationTree from "../json/animation_tree.json"
import { DPUtils } from "./dp_utils"
import { TimeUtils } from "./time_utils"
import animationLength from "../json/animation_length.json"
import attachableAnimations from "../json/attachable_animations.json"

// Player Invert ACs
export const PILegsAC: AnimCtrl = {
    "controller.animation.player.move.legs.reverse": {
        [animationTree.minecraft_dev.player.move.legs.reverse]: { transitions: [{ [animationTree.minecraft_dev.common.none]: "0" }] }
    },
}

export const PIArmsAC: AnimCtrl = {
    "controller.animation.player.move.arms.reverse": {
        [animationTree.minecraft_dev.player.move.arms.reverse]: { transitions: [{ [animationTree.minecraft_dev.common.none]: "0" }] }
    },
}

export const PIHoldingAC: AnimCtrl = {
    "controller.animation.player.holding.reverse": {
        [animationTree.minecraft_dev.player.holding.reverse]: { transitions: [{ [animationTree.minecraft_dev.common.none]: "0" }] }
    },
}

export const PILookAtTargetAC: AnimCtrl = {
    "controller.animation.player.look_at_target.ui.reverse": {
        [animationTree.minecraft_dev.player.look_at_target.ui.reverse]: { transitions: [{ [animationTree.minecraft_dev.common.none]: "0" }] }
    },
}

export const PIAttackRotationsAC: AnimCtrl = {
    "controller.animation.player.attack.rotations.reverse": {
        [animationTree.minecraft_dev.player.attack.rotations.reverse]: { transitions: [{ [animationTree.minecraft_dev.common.none]: "0" }] }
    },
}


export const PISneakingAC: AnimCtrl = {
    "controller.animation.player.sneaking.reverse": {
        [animationTree.minecraft_dev.player.sneaking.reverse]: { transitions: [{ [animationTree.minecraft_dev.common.none]: "!v.is_sneaking" }] },
        [animationTree.minecraft_dev.common.none]: { transitions: [{ [animationTree.minecraft_dev.player.sneaking.reverse]: "v.is_sneaking" }] },
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
            entity.playAnimation(animationTree.minecraft_dev.common.none, {
                controller: controllerName,
                stopExpression: "0",
                nextState: animationTree.minecraft_dev.common.none
            })
        }
    }

    static animbinds(data: { dpId: string, animbinds: { [key: string]: AnimCtrl } }) {
        world.afterEvents.worldLoad.subscribe(() => {
            DPUtils.register(data.dpId, (target: Entity | ItemStack | World, curr: string, prev: string) => {
                if (curr === prev) return
                if (!(target instanceof Player)) return
                if (!!prev && Object.keys(data.animbinds).includes(prev))
                    AnimUtils.unregister(target, data.animbinds[prev])
                if (!!curr && Object.keys(data.animbinds).includes(curr))
                    AnimUtils.register(target, data.animbinds[curr])
            })
        })
    }

    static slots(player: Player, ...series: number[][]) {
        for (let [slot, tick] of series) {
            DPUtils.store().player_animation_slot.set(player, slot, 0, tick)
        }
        return this
    }

    static slotCancel(player: Player, offset: number = 1) {
        DPUtils.store().player_animation_slot.cancel(player, system.currentTick + offset)
        return this
    }

    static animationWithSlot(player: Player, animationId: string, slot: number, delay?: number) {
        if (!delay) {
            delay = Math.floor((animationLength[animationId as keyof typeof animationLength] ?? 0) * 20 - 1)
        }

        player.playAnimation(animationTree.minecraft_dev.common[`slot${slot}` as keyof typeof animationTree.minecraft_dev.common])
        TimeUtils.timeout(() => player.playAnimation(animationId), 1)
        TimeUtils.timeout(() => player.playAnimation(animationTree.minecraft_dev.common.slot0), delay)
    }

    static animationWithAtt(player: Player, animationId: string, attachableId: keyof typeof attachableAnimations, delay?: number) {
        if (!delay) {
            delay = Math.floor((animationLength[animationId as keyof typeof animationLength] ?? 0) * 20 - 1)
        }

        const attAnimations = attachableAnimations[attachableId]
        const entry = Object.entries(attAnimations).find(([, value]) => value === animationId)?.[0]
        const slot = entry ? parseInt(entry.replace("slot", "").replace("_fpp", "")) : 0

        player.playAnimation(animationTree.minecraft_dev.common[`slot${slot}` as keyof typeof animationTree.minecraft_dev.common])
        TimeUtils.timeout(() => player.playAnimation(animationId), 1)
        TimeUtils.timeout(() => player.playAnimation(animationTree.minecraft_dev.common.slot0), delay)
    }
}

DPUtils.store().player_animation_slot.register((entity: Entity | ItemStack | World, curr: number, prev: number) => {
    if (!(entity instanceof Player)) return
    entity.playAnimation(animationTree.minecraft_dev.common.slot0.replace("0", curr.toString()))
})