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

system.afterEvents.scriptEventReceive.subscribe(({ id, message }) => {
    if (id !== ScriptEventIds.DPSetWorld) return
    if (message.includes("=")) {
        const [key, value] = [message.split("=")[0], message.split("=")[1]]
        DPUtils.set(world, key, value)
    } else {
        DPUtils.set(world, message, true)
    }
})

system.afterEvents.scriptEventReceive.subscribe(({ id, message }) => {
    if (id !== ScriptEventIds.DPResetWorld) return
    DPUtils.set(world, message, undefined)
})

// Player DP Sync
system.runInterval(() => {
    world.getAllPlayers().forEach(player => {
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

export class DPUtils {

    static STORE = { ...dpList, ...dpListV2 }

    static REGISTRATION: { [key: string]: ((target: Entity | ItemStack | World, curr: any, prev: any) => any)[] } = {}

    private static mapValues<T extends object, U>(obj: T, fn: (value: T[keyof T], key: keyof T) => U): Record<keyof T, U> {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, fn(value, key as keyof T)])
        ) as Record<keyof T, U>;
    }

    private static parseRaw(raw: any, placeHolder: any) {
        if (raw === undefined) return placeHolder
        if (typeof raw === "number" || typeof raw === "boolean") return raw
        if (typeof raw === "string") {
            try {
                return JSON.parse(raw)
            } catch {
                return raw
            }
        }
        return raw
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
            register: (callback: (target: Entity | ItemStack | World, curr: any, prev: any) => any) => this.register(this.STORE[k as keyof typeof dpList], callback),
        }))
    }

    static set(target: Entity | ItemStack | World, key: string, value: any, placeHolder?: any, delay?: number) {
        if (!target || (target instanceof Entity && !target.isValid)) return

        if (typeof value === "function") {
            const currentRaw = target.getDynamicProperty(key)
            const currentParsed = this.parseRaw(currentRaw, placeHolder)
            value = value(currentParsed)
        }

        if (!delay) {
            let newRaw: string | number | boolean | undefined
            if (typeof value === "number" || typeof value === "boolean") {
                newRaw = value
            } else if (value === undefined) {
                newRaw = undefined
            } else {
                newRaw = JSON.stringify(value)
            }
            // 优化：脏检查，值未变则不调用底层 API
            const currentRaw = target.getDynamicProperty(key)
            if (key in this.REGISTRATION) {
                const prevParsed = this.parseRaw(currentRaw, placeHolder)
                this.REGISTRATION[key].forEach(callback => callback(target, value, prevParsed))
            }

            if (currentRaw === newRaw) return
            // 优化：直接复用 currentRaw，避免二次序列化
            target.setDynamicProperty(`${key}_prev`, currentRaw)
            target.setDynamicProperty(key, newRaw)
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
            Object.keys(newTimeline).filter(t => parseInt(t) >= (startTick ?? system.currentTick)).forEach(t => {
                newTimeline[t] = newTimeline[t].filter((item: any) => !(item.e === target.id && item.k === key))
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

    static curr(target: Entity | ItemStack | World, key: string, placeHolder: any = undefined) {
        if (!target || (target instanceof Entity && !target.isValid)) return placeHolder
        const raw = target.getDynamicProperty(key)
        return this.parseRaw(raw, placeHolder)
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