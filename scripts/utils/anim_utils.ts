import { Entity, ItemStack, Player, world, World } from "@minecraft/server"
import animationTree from "../json/animation_tree.json"
import { DPUtils } from "./dp_utils"
import { TimeUtils } from "./time_utils"
import { dpList } from "../lists/dp_list"

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
                if (!(target instanceof Player)) return
                console.warn("TEST")
                if (!!prev && Object.keys(data.animbinds).includes(prev))
                    AnimUtils.unregister(target, data.animbinds[prev])
                if (!!curr && Object.keys(data.animbinds).includes(curr))
                    AnimUtils.register(target, data.animbinds[curr])
            })
        })
    }

    static animationWithAtt(player: Player, animationId: string, value: number, delay: number) {
        const setMap: { [key: number]: string } = {
            0: animationTree.minecraft_dev.common.set0,
            1: animationTree.minecraft_dev.common.set1,
            2: animationTree.minecraft_dev.common.set2,
            3: animationTree.minecraft_dev.common.set3,
            4: animationTree.minecraft_dev.common.set4,
            5: animationTree.minecraft_dev.common.set5,
            6: animationTree.minecraft_dev.common.set6,
            7: animationTree.minecraft_dev.common.set7,
            8: animationTree.minecraft_dev.common.set8,
            9: animationTree.minecraft_dev.common.set9,
            10: animationTree.minecraft_dev.common.set10,
            11: animationTree.minecraft_dev.common.set11,
            12: animationTree.minecraft_dev.common.set12,
            13: animationTree.minecraft_dev.common.set13,
            14: animationTree.minecraft_dev.common.set14,
            15: animationTree.minecraft_dev.common.set15,
            16: animationTree.minecraft_dev.common.set16,
            17: animationTree.minecraft_dev.common.set17,
            18: animationTree.minecraft_dev.common.set18,
            19: animationTree.minecraft_dev.common.set19,
            20: animationTree.minecraft_dev.common.set20,
        }
        player.playAnimation(setMap[value])
        TimeUtils.timeout(() => player.playAnimation(animationId), 1)
        TimeUtils.timeout(() => {
            player.playAnimation(animationTree.minecraft_dev.common.set0)
        }, delay)
    }
}