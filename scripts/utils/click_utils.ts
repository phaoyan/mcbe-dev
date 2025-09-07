import { Entity, Player, system, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EntityQuery } from "./entity_utils";
import entity_ids from "../json/entity_ids.json"
import { Vector3Utils } from "@minecraft/math";
import { BehaviorUtils, NodeState, BehaviorTemplates } from "./behavior_utils";
import { TimeUtils } from "./time_utils";

// 右键检测
world.afterEvents.itemStartUse.subscribe(({ source: player, itemStack }) => {

})


// 左键检测
// 预注册：左键Dummy跟随行为
BehaviorUtils.register('follow_lclick_dummy', (entity: Entity) => {
    return BehaviorTemplates.follow(
        (e: Entity) => {
            const player = world.getEntity(DPUtils.store().lclick_host.curr(e));
            if (!player || !DPUtils.store().lclick_enable.curr(player)) {
                TimeUtils.timeout(() => {
                    const player = world.getEntity(DPUtils.store().lclick_host.curr(e));
                    if (!player || !DPUtils.store().lclick_enable.curr(player)) {
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
DPUtils.store().lclick_enable.register((target, curr, prev) => {
    if (!(target instanceof Player)) return
    const dummyTypes = [
        entity_ids.lclick_dummy,
    ]
    dummyTypes.forEach((dummyType)=>{
        const dummy = EntityQuery.entitiesByType(target, dummyType)
            .filter(e => DPUtils.store().lclick_host.curr(e) === target.id)
            .first()
        if (curr) {
            if (dummy) return
            const lclick = target.dimension.spawnEntity(dummyType, target.location)
            DPUtils.store().lclick_host.set(lclick, target.id)
            BehaviorUtils.bind(lclick.id, 'follow_lclick_dummy')
        }
    })

})

// 监听并执行左键动画，包括CD计时功能
world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
    if (!DPUtils.store().lclick_enable.curr(damagingEntity)) return
    const player = damagingEntity as Player
    player.runCommand("say Lclick " + system.currentTick + " " + Vector3Utils.distance(hitEntity.location, damagingEntity.location))
})  