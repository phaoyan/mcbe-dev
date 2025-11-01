import { Entity, EquipmentSlot, ItemStack, system, world, World } from "@minecraft/server";
import { dpList } from "../lists/dp_list";
import { ScriptEventIds } from "../lists/event_list";
import { InventoryUtils } from "./inventory_utils";
import { dpListV2 } from "../lists/dp_list_v2";

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (id !== ScriptEventIds.DPList) return
    if (!sourceEntity) {
        world.getDimension("minecraft:overworld").runCommand("say DP Set Error: No Source Entity")
        return
    }
    console.warn(`DP List: ${sourceEntity.getDynamicPropertyIds().join(", ")}`)
    sourceEntity.getDynamicPropertyIds().forEach(id => {
        console.warn(`${id}: ${JSON.stringify(sourceEntity.getDynamicProperty(id))}`)
    })
})

system.afterEvents.scriptEventReceive.subscribe(({ id }) => {
    if (id !== ScriptEventIds.DPListWorld) return
    console.warn(`DP List World (Current Tick: ): ${world.getDynamicPropertyIds().join(", ")}`)
    world.getDynamicPropertyIds().forEach(id => {
        console.warn(`${id}: ${JSON.stringify(world.getDynamicProperty(id))}`)
    })
})

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (id !== ScriptEventIds.DPSet) return
    if (!sourceEntity) {
        world.getDimension("minecraft:overworld").runCommand("say DP Set Error: No Source Entity")
        return
    }
    if (message.includes("=")) {
        const [key, value] = [message.split("=")[0], message.split("=")[1]]
        DPUtils.set(sourceEntity, key, value)
    } else {
        DPUtils.set(sourceEntity, message, true)
    }
    sourceEntity.runCommand("say DP Set Success")
})

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (id !== ScriptEventIds.DPRest) return
    if (!sourceEntity) {
        world.getDimension("minecraft:overworld").runCommand("say DP Reset Error: No Source Entity")
        return
    }
    DPUtils.set(sourceEntity, message, undefined)
    sourceEntity.runCommand("say DP Reset Success")
})

// Player DP Sync
system.runInterval(()=>{
    world.getAllPlayers().forEach(player=>{
        DPUtils.store().player_is_jumping.set(player, player.isJumping)
        DPUtils.store().player_is_running.set(player, player.isSprinting)
        DPUtils.store().player_is_sneaking.set(player, player.isSneaking)
        DPUtils.store().player_is_swimming.set(player, player.isSwimming)
        DPUtils.store().player_is_onground.set(player, player.isOnGround)
        
        const equippables = InventoryUtils.equippables(player)
        DPUtils.store().player_offhand.set(player, equippables.getEquipment(EquipmentSlot.Offhand)?.typeId)
        DPUtils.store().player_mainhand.set(player, equippables.getEquipment(EquipmentSlot.Mainhand)?.typeId)
        DPUtils.store().player_head.set(player, equippables.getEquipment(EquipmentSlot.Head)?.typeId)
        DPUtils.store().player_chest.set(player, equippables.getEquipment(EquipmentSlot.Chest)?.typeId)
        DPUtils.store().player_legs.set(player, equippables.getEquipment(EquipmentSlot.Legs)?.typeId)
        DPUtils.store().player_feet.set(player, equippables.getEquipment(EquipmentSlot.Feet)?.typeId)

        DPUtils.store().player_selected_slot_idx.set(player, player.selectedSlotIndex)
    })
})

// DP Timeline
system.runInterval(() => {
    const timeline = DPUtils.store().world_dp_timeline.curr(world, {})
    if (!!timeline[system.currentTick]) {
        for (const todo of timeline[system.currentTick]) {
            const entity = world.getEntity(todo.e)
            if (!entity) continue
            DPUtils.set(entity, todo.k, todo.v)
        }
    }
    DPUtils.store().world_dp_timeline.set(world, (curr: any) => {
        return Object.fromEntries(Object.entries(curr).filter(([k]) => parseInt(k) > system.currentTick))
    }, {})
})

// DP Activate
system.runInterval(() => {
    const activate = DPUtils.store().world_dp_activate.curr(world, {})
    Object.values(activate).forEach((todo: any) => {
        for (const item of todo) {
            const entity = world.getEntity(item.e)
            if (!entity) continue
            DPUtils.set(entity, item.k, item.v)
        }
    })
    DPUtils.store().world_dp_activate.set(world, (curr: any) => {
        return Object.fromEntries(Object.entries(curr).filter(([k]) => parseInt(k) > system.currentTick))
    }, {})
})

export class DPUtils {

    static STORE = { ...dpList, ...dpListV2 }

    static REGISTRATION: { [key: string]: ((target: Entity | ItemStack | World, curr: any, prev: any) => any)[] } = {}

    private static mapValues<T extends object, U>(obj: T, fn: (value: T[keyof T], key: keyof T) => U): Record<keyof T, U> {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, fn(value, key as keyof T)])
        ) as Record<keyof T, U>;
    }

    static store() {
        return this.mapValues(this.STORE, (v, k) => ({
            id: v,
            curr: (target: Entity | ItemStack | World, placeHolder?: any) => this.curr(target, this.STORE[k as keyof typeof dpList], placeHolder),
            prev: (target: Entity | ItemStack | World, placeHolder?: any) => this.prev(target, this.STORE[k as keyof typeof dpList], placeHolder),
            both: (target: Entity | ItemStack | World, placeHolder?: any) => this.both(target, this.STORE[k as keyof typeof dpList], placeHolder),
            set: (target: Entity | ItemStack | World, value: any, placeHolder?: any, delay?: number) => this.set(target, this.STORE[k as keyof typeof dpList], value, placeHolder, delay),
            cancel: (target: Entity | ItemStack | World, startTick?: number) => this.cancel(target, this.STORE[k as keyof typeof dpList], startTick),
            temp: (target: Entity | ItemStack | World, value: any, ticks: number, placeHolder?: any) => this.temp(target, this.STORE[k as keyof typeof dpList], value, ticks, placeHolder),
            activate: (target: Entity | ItemStack | World, value: any, duration?: number, placeHolder?: any) => this.activate(target, this.STORE[k as keyof typeof dpList], value, duration, placeHolder),
            deactivate: (target: Entity | ItemStack | World, placeHolder?: any) => this.deactivate(target, this.STORE[k as keyof typeof dpList], placeHolder),
            register: (callback: (target: Entity | ItemStack | World, curr: any, prev: any) => any) => this.register(this.STORE[k as keyof typeof dpList], callback),
        }))
    }

    static set(target: Entity | ItemStack | World, key: string, value: any, placeHolder?: any, delay?: number) {
        if (!target || (target instanceof Entity && !target.isValid)) return
        if (typeof value === "function")
            value = value(DPUtils.curr(target, key, placeHolder))
        const prev = this.curr(target, key, placeHolder)  // 获取解析后的之前值，保持类型一致
        if (!delay) {
            target.setDynamicProperty(`${key}_prev`, target.getDynamicProperty(key))  // 保存原始值用于prev方法
            target.setDynamicProperty(key, JSON.stringify(value))

            if (key in this.REGISTRATION) {
                this.REGISTRATION[key].forEach(callback => callback(target, value, prev))
            }
        } else {
            if (!(target instanceof Entity)) return
            DPUtils.store().world_dp_timeline.set(world, (curr: any) => {
                const newTimeline = { ...curr }
                const newItem = { e: target.id, k: key, v: value }
                newTimeline[system.currentTick + delay] = [...(newTimeline[system.currentTick + delay] ?? []), newItem]
                return newTimeline
            }, {})
        }
    }

    static cancel(target: Entity | ItemStack | World, key: string, startTick?: number) {
        if (!(target instanceof Entity)) return
        DPUtils.store().world_dp_timeline.set(world, (curr: any) => {
            const newTimeline = { ...curr }
            Object.keys(newTimeline).filter(t=>parseInt(t)>=(startTick??system.currentTick)).forEach(t=>{
                newTimeline[t] = newTimeline[t].filter((item: any)=>!(item.e===target.id && item.k===key))
            })
            return newTimeline
        }, {})
    }

    static temp(target: Entity | ItemStack | World, key: string, value: any, ticks: number, placeHolder?: any) {
        if (!target || (target instanceof Entity && !target.isValid)) return placeHolder
        const prev = this.curr(target, key, placeHolder)
        this.set(target, key, value)
        this.set(target, key, prev, placeHolder ?? prev, ticks)
        return DPUtils
    }

    static activate(target: Entity | ItemStack | World, key: string, value: any, duration?: number, placeHolder?: any) {
        if (!target || (target instanceof Entity && !target.isValid)) return
        if (!(target instanceof Entity)) return
        if (typeof value === "function")
            value = value(DPUtils.curr(target, key, placeHolder))

        DPUtils.store().world_dp_activate.set(world, (curr: any) => {
            const newTimeline = { ...curr }
            const newItem = { e: target.id, k: key, v: value }
            newTimeline[system.currentTick + (duration ?? 99999999)] = [...(newTimeline[system.currentTick + (duration ?? 99999999)] ?? []), newItem]
            return newTimeline
        }, {})
    }

    static deactivate(target: Entity | ItemStack | World, key: string, placeHolder?: any) {
        if (!target || (target instanceof Entity && !target.isValid)) return
        if (!(target instanceof Entity)) return
        DPUtils.store().world_dp_activate.set(world, (curr: any) => {
            const newTimeline = { ...curr }
            for (let t of Object.keys(newTimeline)) {
                newTimeline[t] = newTimeline[t].filter((item: any) => item.e !== target.id || item.k !== key)
            }
            return newTimeline
        }, {})
        this.set(target, key, placeHolder)
    }

    static curr(target: Entity | ItemStack | World, key: string, placeHolder: any = undefined) {
        if (!target || (target instanceof Entity && !target.isValid)) return placeHolder
        const raw = target.getDynamicProperty(key)
        if (raw === undefined) return placeHolder
        return JSON.parse(target.getDynamicProperty(key) as string)
    }

    static prev(target: Entity | ItemStack | World, key: string, placeHolder: any) {
        if (!target || (target instanceof Entity && !target.isValid)) return placeHolder
        return this.curr(target, `${key}_prev`, placeHolder)
    }

    static both(target: Entity | ItemStack | World, key: string, placeHolder: any = undefined) {
        return {
            curr: this.curr(target, key, placeHolder),
            prev: this.prev(target, key, placeHolder),
        }
    }

    static register(key: string, callback: (target: Entity | ItemStack | World, curr: any, prev: any) => any) {
        if (key in this.REGISTRATION) {
            this.REGISTRATION[key].push(callback)
        } else {
            this.REGISTRATION[key] = [callback]
        }
        return DPUtils
    }

    // 将动态属性和静态属性同步
    static sync(key: string, propertyId: string, placeHolder: boolean | number | string) {
        DPUtils.register(key, (target, curr, prev) => {
            if (!target || (target instanceof Entity && !target.isValid)) return
            if (!(target instanceof Entity)) return
            target.setProperty(propertyId, (curr as typeof placeHolder) ?? placeHolder)
        })
    }
}