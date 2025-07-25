import { ItemStack, Player, system, world } from "@minecraft/server";
import { DPUtils } from "../utils/dp_utils";
import { EntityUtils, EntityUtilsOptions } from "../utils/entity_utils";
import entity_ids from "../json/entity_ids.json"
import { Vector3Utils } from "@minecraft/math";
import { InventoryUtils } from "../utils/inventory_utils";

// 返回值为动画时长
const lclickMap: { [key: string]: (player: Player, item: ItemStack) => number } = {
    
}

// 监听并管理Dummy
DPUtils.store().lclick_enable.register((target, curr, prev) => {
    if (!(target instanceof Player)) return
    const dummy = EntityUtils.entities(target).filter(e => DPUtils.store().lclick_host.curr(e) === target.id).getFirst()
    if (!curr) {
        if (!dummy) return
        dummy.remove()
    } else {
        if (dummy) return
        const lclick = target.dimension.spawnEntity(entity_ids.lclick_dummy, target.location)
        DPUtils.store().lclick_host.set(lclick, target.id)
    }
})

// 将Dummy TP到正确的位置
system.runInterval(() => {
    world.getAllPlayers().forEach(player => {
        if(!DPUtils.store().lclick_enable.curr(player), false) return
        const entities = EntityUtils.entities(player, EntityUtilsOptions.All).get()
        EntityUtils.enumerate(entities).selectByTypeId(entity_ids.lclick_dummy).foreach(e=>{
            const host = EntityUtils.enumerate(entities).selectById(DPUtils.store().lclick_host.curr(e)).getFirst()
            if (!host) return
            const correction = Vector3Utils.magnitude(player.getVelocity())*12
            const loc = {
                x: host.location.x + host.getViewDirection().x*correction,
                y: host.location.y + host.getViewDirection().y,
                z: host.location.z + host.getViewDirection().z*correction
            }
            e.teleport(loc, { rotation: host.getRotation() })
        })
    })
})

// 监听并执行左键动画，包括CD计时功能
world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
    if (!DPUtils.store().lclick_enable.curr(damagingEntity)) return
    if (DPUtils.store().lclick_host.curr(hitEntity) !== damagingEntity.id) return
    if (DPUtils.store().lclick_cooldown.curr(damagingEntity) > system.currentTick) return
    const player = damagingEntity as Player
    const selected = InventoryUtils.entity(player).getItem(player.selectedSlotIndex)
    if (!selected) return
    if (!Object.keys(lclickMap).includes(selected.typeId)) return
    const duration = lclickMap[selected.typeId](player, selected)
    DPUtils.store().lclick_cooldown.set(damagingEntity, system.currentTick + duration)
})