import { Entity, ItemStack, system, world, World } from "@minecraft/server";
import { dpList } from "../lists/dp_list";

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (id !== "dp:set") return
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
    if (id !== "dp:reset") return
    if (!sourceEntity) {
        world.getDimension("minecraft:overworld").runCommand("say DP Reset Error: No Source Entity")
        return
    }
    DPUtils.set(sourceEntity, message, undefined)
    sourceEntity.runCommand("say DP Reset Success")
})

// DP Timeline
system.runInterval(() => {
    const timeline = DPUtils.store().world_dp_timeline.curr(world, {})
    if (!!timeline[system.currentTick]) {
        for (const todo of timeline[system.currentTick]) {
            const entity = world.getEntity(todo.e)
            if (!entity) return
            DPUtils.set(entity, todo.k, todo.v)
        }
        DPUtils.store().world_dp_timeline.set(world, (curr: any) => {
            const newTimeline = { ...curr }
            delete newTimeline[system.currentTick]
            return newTimeline
        })
    }
})

// DP Activate
system.runInterval(() => {
    const activate = DPUtils.store().world_dp_activate.curr(world, {})
    Object.values(activate).forEach((todo: any) => {
        for (const item of todo) {
            const entity = world.getEntity(item.e)
            if (!entity) return
            DPUtils.set(entity, item.k, item.v)
        }
    })
    DPUtils.store().world_dp_activate.set(world, (curr: any) => {
        const newTimeline = { ...curr }
        delete newTimeline[system.currentTick]
        return newTimeline
    })
})

export class DPUtils {

    static STORE = { ...dpList }

    static REGISTRATION: { [key: string]: ((target: Entity | ItemStack | World, curr: any, prev: any) => any)[] } = {}

    private static mapValues<T extends object, U>(obj: T, fn: (value: T[keyof T], key: keyof T) => U): Record<keyof T, U> {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, fn(value, key as keyof T)])
        ) as Record<keyof T, U>;
    }

    static store() {
        return this.mapValues(this.STORE, (v, k) => ({
            id: v,
            curr: (target: Entity | ItemStack | World, placeHolder?: any) => this.curr(target, dpList[k as keyof typeof dpList], placeHolder),
            prev: (target: Entity | ItemStack | World, placeHolder?: any) => this.prev(target, dpList[k as keyof typeof dpList], placeHolder),
            both: (target: Entity | ItemStack | World, placeHolder?: any) => this.both(target, dpList[k as keyof typeof dpList], placeHolder),
            set: (target: Entity | ItemStack | World, value: any, placeHolder?: any, delay?: number) => this.set(target, dpList[k as keyof typeof dpList], value, placeHolder, delay),
            temp: (target: Entity | ItemStack | World, value: any, ticks: number, placeHolder?: any) => this.temp(target, dpList[k as keyof typeof dpList], value, ticks, placeHolder),
            activate: (target: Entity | ItemStack | World, value: any, duration?: number, placeHolder?: any) => this.activate(target, dpList[k as keyof typeof dpList], value, duration, placeHolder),
            deactivate: (target: Entity | ItemStack | World, placeHolder?: any) => this.deactivate(target, dpList[k as keyof typeof dpList], placeHolder),
            register: (callback: (target: Entity | ItemStack | World, curr: any, prev: any) => any) => this.register(dpList[k as keyof typeof dpList], callback),
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