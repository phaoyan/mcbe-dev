import { ItemStack, Player, system, world } from "@minecraft/server";
import { DPUtils } from "../utils/dp_utils";
import { EntityUtils } from "../utils/entity_utils";
import entity_ids from "../json/entity_ids.json"
import { Vector3Utils } from "@minecraft/math";
import { InventoryUtils } from "../utils/inventory_utils";
import { VecUtils } from "../utils/vec_utils";

// 返回值为动画时长
const lclickMap: { [key: string]: (player: Player, item: ItemStack) => number } = {

}

const DummyOffsets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

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
system.runInterval(() => {
    world.getAllPlayers().forEach(player => {
        if (!DPUtils.store().lclick_enable.curr(player), false) return
        const move = player.inputInfo.getMovementVector()
        const dummies = EntityUtils.entitiesByType(player, entity_ids.lclick_dummy)
            .filter(e => DPUtils.store().lclick_host.curr(e) === player.id)
            .get()
        if (!dummies) return
        for (let i = 0; i < DummyOffsets.length; i++) {
            const dummy = dummies.filter(e => DPUtils.store().lclick_dummy_idx.curr(e) === i)[0]
            if (!dummy) return
            const offset = Vector3Utils.magnitude(player.getVelocity()) * DummyOffsets[i]
            const vy = player.getViewDirection().y
            const loc = VecUtils.start(player).moveF(offset * Math.max(move.y, -3)).moveY(vy * i * 0.25).moveR(offset * move.x * 0.4).end()
            dummy.teleport(loc, { rotation: player.getRotation() })
        }
    })
})

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