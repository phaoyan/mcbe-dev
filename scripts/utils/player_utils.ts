import { Entity, ItemStack, Player, system, World, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EntityQuery } from "./entity_utils";
import entityTree from "../json/entity_tree.json"
import { BehaviorUtils, NodeState, BehaviorTemplates } from "./behavior_utils";
import { TimeUtils } from "./time_utils";
import { OpList } from "../lists/op_list";

const INPUT_PATTERN_LENGTH = 3
const RCL_THRESHOLD = 2 // 右键长按阈值Ticks

export interface PlayerInputPattern {
    moment: number
    type: string
}

export interface PlayerOperationMap {
    lc?: string
    rcs?: string
    rcl?: string
    jump?: string
    sneak?: string
    run?: string
}

export const DefaultPlayerOperationMap: PlayerOperationMap = {
    lc: OpList.None,
    rcs: OpList.None,
    rcl: OpList.None,
    jump: OpList.None,
    sneak: OpList.None,
    run: OpList.None,
}

const inputDetectionEnable = (player: Entity, type: keyof PlayerOperationMap)=>{
    const opMap: PlayerOperationMap = DPUtils.store().player_operation_map.curr(player, {})
    return Object.keys(opMap).includes(type)
}

// 左键检测
// 预注册：左键Dummy跟随行为
BehaviorUtils.register(entityTree.dummy.lclick.lclick_dummy, (entity: Entity) => {
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
    const dummyType = entityTree.dummy.lclick.lclick_dummy
    const dummy = EntityQuery.entities(target, {dist: 32, types: [dummyType], filter: e => DPUtils.store().lclick_host.curr(e) === target.id}).first()
    if (lclickEnable && !dummy) {
        const lclick = target.dimension.spawnEntity(dummyType, target.location)
        DPUtils.store().lclick_host.set(lclick, target.id)
        BehaviorUtils.bind(lclick.id, entityTree.dummy.lclick.lclick_dummy)
    }
})


// 左键检测
world.afterEvents.entityHitEntity.subscribe(({ damagingEntity }) => {
    if (!inputDetectionEnable(damagingEntity, "lc")) return
    DPUtils.store().player_input_pattern.set(damagingEntity, (curr: any)=>([...curr, {moment: system.currentTick, type: "lc"}]).slice(-INPUT_PATTERN_LENGTH), [])
})  

// 右键检测
world.afterEvents.itemStartUse.subscribe(({ source: player, itemStack }) => {
    if (!inputDetectionEnable(player, "rcs")) return
    DPUtils.store().player_rclick_start.set(player, system.currentTick)
})

world.afterEvents.itemReleaseUse.subscribe(({ source: player, itemStack }) => {
    if (!inputDetectionEnable(player, "rcs")) return
    const rclickStart = DPUtils.store().player_rclick_start.curr(player, 0)
    if (system.currentTick - rclickStart > RCL_THRESHOLD) {
        DPUtils.store().player_input_pattern.set(player, (curr: any)=>([...curr, {moment: system.currentTick, type: "rcl"}]).slice(-INPUT_PATTERN_LENGTH), [])
    } else {
        DPUtils.store().player_input_pattern.set(player, (curr: any)=>([...curr, {moment: system.currentTick, type: "rcs"}]).slice(-INPUT_PATTERN_LENGTH), [])
    }
})

// 跳跃检测
DPUtils.store().player_is_jumping.register((target, curr, prev) => {
    if (prev === curr) return
    if (!(target instanceof Player) || !inputDetectionEnable(target, "jump")) return
    if (curr && !prev) {
        DPUtils.store().player_input_pattern.set(target, (curr: any)=>([...curr, {moment: system.currentTick, type: "jump"}]).slice(-INPUT_PATTERN_LENGTH), [])
    }
})

// 下蹲检测
DPUtils.store().player_is_sneaking.register((target, curr, prev) => {
    if (prev === curr) return
    if (!(target instanceof Player) || !inputDetectionEnable(target, "sneak")) return
    if (curr && !prev) {
        DPUtils.store().player_input_pattern.set(target, (curr: any)=>([...curr, {moment: system.currentTick, type: "sneak"}].slice(-INPUT_PATTERN_LENGTH)), [])
    }
})

// 疾跑检测
DPUtils.store().player_is_running.register((target, curr, prev) => {
    if (prev === curr) return
    if (!(target instanceof Player) || !inputDetectionEnable(target, "run")) return
    if (curr && !prev) {
        DPUtils.store().player_input_pattern.set(target, (curr: any)=>([...curr, {moment: system.currentTick, type: "run"}]).slice(-INPUT_PATTERN_LENGTH), [])
    }
})

DPUtils.store().player_input_pattern.register((target, curr, prev) => {
    if (curr === prev) return
    if (!(target instanceof Player)) return
    const opMap = DPUtils.store().player_operation_map.curr(target, {})
    PlayerUtils.PlayerOperations[opMap[curr[curr.length - 1].type]](target)
})

export class PlayerUtils {
    static PlayerOperations: { [key: string]: (player: Player)=>void } = {}

    static registerOp(opId: string, operation: (player: Player)=>void) {
        PlayerUtils.PlayerOperations[opId] = operation
        return PlayerUtils
    }

    static setOp(player: Player, type: string, opId: string) {
        DPUtils.store().player_operation_map.set(player, (curr: any)=>{
            curr[type] = opId
            return curr
        }, {})
    }

    static resetOp(player: Player, type: string) {
        DPUtils.store().player_operation_map.set(player, (curr: any)=>{
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

    static opbinds(data: {
        triggers: string | string[],
        mapping: (player: Player) => PlayerOperationMap
    }){
        const triggers = Array.isArray(data.triggers) ? data.triggers : [data.triggers]
        world.afterEvents.worldLoad.subscribe(() => {
            triggers.forEach(trigger=>{
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
        return PlayerUtils
    }
}