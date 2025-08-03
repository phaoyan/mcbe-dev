import { Entity, ItemStack, Player, system, world } from "@minecraft/server";
import { DPUtils } from "../utils/dp_utils";
import { EntityUtils } from "../utils/entity_utils";
import entity_ids from "../json/entity_ids.json"
import { Vector3Utils } from "@minecraft/math";
import { InventoryUtils } from "../utils/inventory_utils";
import { VecUtils } from "../utils/vec_utils";
import { BehaviorUtils } from "../utils/behavior_utils";

// 返回值为动画时长
const lclickMap: { [key: string]: (player: Player, item: ItemStack) => number } = {

}

const DummyOffsets = [3, 5, 7, 9, 11, 13, 15, 17, 19]

// 监听并管理Dummy
DPUtils.store().lclick_enable.register((target, curr, prev) => {
    if (!(target instanceof Player)) return
    const dummies = EntityUtils.entitiesByType(target, entity_ids.lclick_dummy)
        .filter(e => DPUtils.store().lclick_host.curr(e) === target.id)
        .get()
    for (let i = 0; i < DummyOffsets.length; i++) {
        const dummy = dummies.filter(e => DPUtils.store().lclick_dummy_idx.curr(e) === i)[0]
        if (!curr) {
            if (!dummy) return
            dummy.remove()
        } else {
            if (dummy) return
            const lclick = target.dimension.spawnEntity(entity_ids.lclick_dummy, target.location)
            DPUtils.store().lclick_host.set(lclick, target.id)
            DPUtils.store().lclick_dummy_idx.set(lclick, i)
        }
    }
})

// 将Dummy TP到正确的位置
BehaviorUtils
.initSingle((entity: Entity) => {
    const player = world.getEntity(DPUtils.store().lclick_host.curr(entity))
    if (!player) {
        entity.remove()
        return
    }
    const move = (player as Player).inputInfo.getMovementVector()
    const idx = DPUtils.store().lclick_dummy_idx.curr(entity)
    const offset = Vector3Utils.magnitude(player.getVelocity()) * DummyOffsets[idx]
    const vy = (player as Player).getViewDirection().y
    const loc = VecUtils.start(player).moveF(offset * Math.max(move.y, -3)).moveY(vy * idx * 0.25).moveR(offset * move.x * 0.4).end()
    entity.teleport(loc, { rotation: player.getRotation() })
})
.register(entity_ids.lclick_dummy)

// 监听并执行左键动画，包括CD计时功能
world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
    if (!DPUtils.store().lclick_enable.curr(damagingEntity)) return
    if (DPUtils.store().lclick_cooldown.curr(damagingEntity, 0) > system.currentTick) return
    const player = damagingEntity as Player
    const selected = InventoryUtils.entity(player).getItem(player.selectedSlotIndex)
    if (!selected) return
    if (!Object.keys(lclickMap).includes(selected.typeId)) return
    const duration = lclickMap[selected.typeId](player, selected)
    DPUtils.store().lclick_cooldown.set(damagingEntity, system.currentTick + duration)
})