import { Entity, EquipmentSlot, ItemStack, Player, system, World, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EntityQr } from "./entity_utils";
import { entityTree } from "../refs/ref"
import { BehaviorUtils, NodeState, BehaviorTemplates } from "./behavior_utils";
import { TimeUtils } from "./time_utils";
import { InventoryUtils } from "./inventory_utils";

const INPUT_PATTERN_LENGTH = 3

export interface PlayerInputPattern {
    moment: number
    type: string
}

export interface PlayerOperationMap {
    lc?: string
    rca?: string // right click attack
    rcr?: string // right click release
    jump?: string
    sneak?: string
    stw?: string // sneak to walk
    run?: string
    rtw?: string // run to walk
}

export const InputLockTypes = {
    lc: "lc",
    rca: "rca",
    rcr: "rcr",
    jump: "jump",
    sneak: "sneak",
    stw: "stw",
    run: "run",
    rtw: "rtw",
}

export const DefaultPlayerOperationMap: PlayerOperationMap = {
    lc: "None",
    rca: "None",
    rcr: "None",
    jump: "None",
    sneak: "None",
    stw: "None",
    run: "None",
    rtw: "None",
}

const inputDetectionEnable = (player: Entity, type: keyof PlayerOperationMap) => {
    const opMap: PlayerOperationMap = DPUtils.store().player_operation_map.curr(player, {})
    return Object.keys(opMap).includes(type)
}

// 左键检测
// 预注册：左键Dummy跟随行为
BehaviorUtils.register(entityTree.dummy.lclick_dummy, (entity: Entity) => {
    return BehaviorTemplates.follow(
        (e: Entity) => {
            const player = world.getEntity(DPUtils.store().lclick_host.curr(e));
            if (!player || !inputDetectionEnable(player, "lc")) {
                TimeUtils.timeout(() => {
                    const player = world.getEntity(DPUtils.store().lclick_host.curr(e));
                    if (!player || !inputDetectionEnable(player, "lc")) {
                        e.remove()
                    }
                }, 60)
                return null;
            }
            return player;
        },
        (e: Entity, target: Entity) => {
            const player = target as Player;
            e.teleport(player.location, { rotation: player.getRotation() });
            return NodeState.SUCCESS;
        },
        0
    );
});
DPUtils.store().player_operation_map.register((target) => {
    if (!(target instanceof Player)) return
    const lclickEnable = inputDetectionEnable(target, "lc")
    if (!lclickEnable) return
    const dummyType = entityTree.dummy.lclick_dummy
    const dummy = EntityQr.entities(target, { dist: 32, types: [dummyType], filter: e => DPUtils.store().lclick_host.curr(e) === target.id }).first()
    if (lclickEnable && !dummy) {
        const lclick = target.dimension.spawnEntity(dummyType, target.location)
        DPUtils.store().lclick_host.set(lclick, target.id)
    }
})


// 左键检测
world.afterEvents.entityHitEntity.subscribe(({ damagingEntity }) => {
    if (!(damagingEntity instanceof Player)) return
    if (!inputDetectionEnable(damagingEntity, "lc")) return
    DPUtils.store().player_input_pattern.set(damagingEntity, (curr: any) => ([...curr, { moment: system.currentTick, type: InputLockTypes.lc }]).slice(-INPUT_PATTERN_LENGTH), [])
})

// 右键检测
world.afterEvents.itemStartUse.subscribe(({ source: player }) => {
    if (!inputDetectionEnable(player, "rca")) return
    DPUtils.store().player_input_pattern.set(player, (curr: any) => ([...curr, { moment: system.currentTick, type: InputLockTypes.rca }]).slice(-INPUT_PATTERN_LENGTH), [])
})

world.afterEvents.itemReleaseUse.subscribe(({ source: player }) => {
    if (!inputDetectionEnable(player, "rcr")) return
    DPUtils.store().player_input_pattern.set(player, (curr: any) => ([...curr, { moment: system.currentTick, type: InputLockTypes.rcr }]).slice(-INPUT_PATTERN_LENGTH), [])
})

// 跳跃检测
DPUtils.store().player_is_jumping.register((target, curr, prev) => {
    if (prev === curr) return
    if (!(target instanceof Player) || !inputDetectionEnable(target, "jump")) return
    if (curr && !prev) {
        DPUtils.store().player_input_pattern.set(target, (curr: any) => ([...curr, { moment: system.currentTick, type: InputLockTypes.jump }]).slice(-INPUT_PATTERN_LENGTH), [])
    }
})

// 下蹲检测
DPUtils.store().player_is_sneaking.register((target, curr, prev) => {
    if (prev === curr) return
    if (!(target instanceof Player) || !inputDetectionEnable(target, "sneak")) return
    if (curr && !prev) {
        DPUtils.store().player_input_pattern.set(target, (curr: any) => ([...curr, { moment: system.currentTick, type: InputLockTypes.sneak }].slice(-INPUT_PATTERN_LENGTH)), [])
    }
})

// sneak to idle 检测
DPUtils.store().player_is_sneaking.register((target, curr, prev) => {
    if (prev === curr) return
    if (!(target instanceof Player) || !inputDetectionEnable(target, "stw")) return
    if (!curr && prev) {
        DPUtils.store().player_input_pattern.set(target, (curr: any) => ([...curr, { moment: system.currentTick, type: InputLockTypes.stw }]).slice(-INPUT_PATTERN_LENGTH), [])
    }
})

// 疾跑检测
DPUtils.store().player_is_running.register((target, curr, prev) => {
    if (prev === curr) return
    if (!(target instanceof Player) || !inputDetectionEnable(target, "run")) return
    if (curr && !prev) {
        DPUtils.store().player_input_pattern.set(target, (curr: any) => ([...curr, { moment: system.currentTick, type: InputLockTypes.run }]).slice(-INPUT_PATTERN_LENGTH), [])
    }
})

// run to walk 检测
DPUtils.store().player_is_running.register((target, curr, prev) => {
    if (prev === curr) return
    if (!(target instanceof Player) || !inputDetectionEnable(target, "rtw")) return
    if (!curr && prev) {
        DPUtils.store().player_input_pattern.set(target, (curr: any) => ([...curr, { moment: system.currentTick, type: InputLockTypes.rtw }]).slice(-INPUT_PATTERN_LENGTH), [])
    }
})

DPUtils.store().player_input_pattern.register((target, curr, prev) => {
    if (curr === prev) return
    if (!(target instanceof Player)) return
    const opMap = DPUtils.store().player_operation_map.curr(target, {})
    const currInput = curr[curr.length - 1]?.type
    const inputLock = DPUtils.store().player_input_lock.curr(target, undefined)
    if (inputLock && !inputLock.includes(currInput)) {
        return
    }
    InputUtils.PlayerOperations[opMap[currInput] ?? "None"](target)
})

export class InputUtils {
    static PlayerOperations: { [key: string]: (player: Player) => void } = {}
    static PlayerOperationMaps: { [key: string]: PlayerOperationMap } = {}

    static registerOp(opId: string, operation: (player: Player) => void) {
        InputUtils.PlayerOperations[opId] = operation
        return InputUtils
    }

    static registerOps(data: { [key: string]: (player: Player) => void }) {
        Object.entries(data).forEach(([key, value]) => {
            InputUtils.registerOp(key, value)
        })
        return InputUtils
    }

    static registerOpMap(opmapId: string, data: {
        lc: (player: Player) => void
        rca: (player: Player) => void
        rcr: (player: Player) => void
        jump: (player: Player) => void
        sneak: (player: Player) => void
        stw: (player: Player) => void
        run: (player: Player) => void
        rtw: (player: Player) => void
    }) {

        Object.entries(data).forEach(([key, value]) => InputUtils.registerOp(`${opmapId}_${key}`, value))
        InputUtils.PlayerOperationMaps[opmapId] = Object.fromEntries(Object.entries(data).map(([key]) => [key, `${opmapId}_${key}`]))
        return InputUtils
    }

    static getOpMap(opmapId: string) {
        return InputUtils.PlayerOperationMaps[opmapId]
    }

    static setOp(player: Player, type: string, opId: string) {
        DPUtils.store().player_operation_map.set(player, (curr: any) => {
            curr[type] = opId
            return curr
        }, {})
    }

    static resetOp(player: Player, type: string) {
        DPUtils.store().player_operation_map.set(player, (curr: any) => {
            delete curr[type]
            return curr
        }, {})
    }

    static setOpMap(player: Player, operationMap: PlayerOperationMap) {
        DPUtils.store().player_operation_map.set(player, operationMap, {})
    }

    static resetOpMap(player: Player) {
        DPUtils.store().player_operation_map.set(player, {}, {})
    }

    static inputPattern(player: Player) {
        return DPUtils.store().player_input_pattern.curr(player, [])
    }

    static inputDelta(player: Player, type: string) {
        const inputPattern = this.inputPattern(player)
        const lastInput = inputPattern.find((item: PlayerInputPattern) => item.type === type)?.moment ?? 99999
        return system.currentTick - lastInput
    }

    static inputLock(player: Player, types: string[]) {
        DPUtils.store().player_input_lock.set(player, types)
    }

    static inputUnlock(player: Player) {
        DPUtils.store().player_input_lock.set(player, undefined)
    }

    static opbinds(data: {
        triggers: string | string[],
        mapping: (player: Player) => PlayerOperationMap
    }) {
        const triggers = Array.isArray(data.triggers) ? data.triggers : [data.triggers]
        world.afterEvents.worldLoad.subscribe(() => {
            triggers.forEach(trigger => {
                DPUtils.register(trigger, (target: Entity | ItemStack | World, curr, prev) => {
                    if (prev === curr) return
                    if (!(target instanceof Player)) return
                    const opMap = data.mapping(target)
                    Object.entries(opMap).forEach(([key, value]) => {
                        if (!this.PlayerOperations[value]) {
                            this.resetOp(target, key)
                        } else {
                            this.setOp(target, key, value)
                        }
                    })
                })
            })
        })
        return InputUtils
    }
}

export class InputTemplates {
    static none(player: Player) { }

    // 右键长短按
    static rcls(data: {
        rcl: (player: Player) => void,
        rcs: (player: Player) => void,
        threshold: number,
    }) {
        return {
            rca: (player: Player) => {
                DPUtils.store().player_rcflag.set(player, true)
                TimeUtils.timeout(() => {
                    const rcflag = DPUtils.store().player_rcflag.curr(player, false)
                    if (!rcflag) return
                    data.rcl(player)
                }, data.threshold + 1)
            },
            rcr: (player: Player) => {
                const inputDelta = InputUtils.inputDelta(player, "rca")
                if (inputDelta <= data.threshold && DPUtils.store().player_rcflag.curr(player, false)) {
                    DPUtils.store().player_rcflag.set(player, false)
                    data.rcs(player)
                }
            },
        }
    }

    // shift长短按
    static snkls(data: {
        snkl: (player: Player) => void,
        snks: (player: Player) => void,
        threshold: number,
    }) {
        return {
            sneak: (player: Player) => {
                DPUtils.store().player_snkflag.set(player, true)
                TimeUtils.timeout(() => {
                    const snkflag = DPUtils.store().player_snkflag.curr(player, false)
                    if (!snkflag) return
                    data.snkl(player)
                }, data.threshold + 1)
            },
            stw: (player: Player) => {
                DPUtils.store().player_snkflag.set(player, false)
                const inputDelta = InputUtils.inputDelta(player, "rca")
                if (inputDelta <= data.threshold && DPUtils.store().player_snkflag.curr(player, false)) {
                    InputUtils.inputUnlock(player)
                } else {
                    data.snks(player)
                }
            },
        }
    }
}

export class CDUtils {
    static skill(
        player: Player,
        data: {
            id: string,
            duration: number,
            cooldown: number
            filter?: (player: Player) => boolean,
            action: (player: Player) => number | void,
        }
    ){
        const { id, duration, cooldown, filter, action } = data
        if (filter && !filter(player)) return

        const locking = DPUtils.store().player_skill_locking.curr(player, 0)
        if (locking > system.currentTick) return
        
        const cooldowns = DPUtils.store().player_skill_cooldowns.curr(player, {})
        const cd = cooldowns[id] ?? 0
        if (system.currentTick < cd) {
            player.onScreenDisplay.setActionBar(`Skill Cooldown: ${Math.ceil((cd - system.currentTick) / 20)}s`)
            return
        }
        player.startItemCooldown(id, Math.ceil(cooldown))
        cooldowns[id] = system.currentTick + Math.ceil(cooldown) + duration
        DPUtils.store().player_skill_cooldowns.set(player, cooldowns)

    }
}