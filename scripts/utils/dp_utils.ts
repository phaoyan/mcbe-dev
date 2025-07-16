import { Entity, ItemStack, World } from "@minecraft/server";
import { TimeUtils } from "./time_utils";

export class DPUtils {

    static STORE = {}

    static REGISTRATION: { [key: string]: ((target: Entity | ItemStack | World, curr: any, prev: any) => any)[] } = {}

    private static mapValues<T extends object, U>(obj: T, fn: (value: T[keyof T], key: keyof T) => U): Record<keyof T, U> {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, fn(value, key as keyof T)])
        ) as Record<keyof T, U>;
    }

    static store() {
        return this.mapValues(this.STORE, (v, k) => ({
            id: v,
            curr: (target: Entity | ItemStack | World, placeHolder?: any) => this.curr(target, k, placeHolder),
            prev: (target: Entity | ItemStack | World, placeHolder?: any) => this.prev(target, k, placeHolder),
            both: (target: Entity | ItemStack | World, placeHolder?: any) => this.both(target, k, placeHolder),
            set: (target: Entity | ItemStack | World, value: any, placeHolder?: any) => this.set(target, k, value, placeHolder),
            temp: (target: Entity | ItemStack | World, value: any, ticks: number) => this.temp(target, k, value, ticks),
            register: (callback: (target: Entity | ItemStack | World, curr: any, prev: any) => any) => this.register(k, callback),
        }))
    }

    static set(target: Entity | ItemStack | World, key: string, value: any, placeHolder?: any) {
        if (typeof value === "function")
            value = value(DPUtils.curr(target, key, placeHolder))
        const prev = this.curr(target, key, placeHolder)  // 获取解析后的之前值，保持类型一致
        target.setDynamicProperty(`${key}_prev`, target.getDynamicProperty(key))  // 保存原始值用于prev方法
        target.setDynamicProperty(key, JSON.stringify(value))

        if (key in this.REGISTRATION) {
            this.REGISTRATION[key].forEach(callback => callback(target, value, prev))
        }
    }

    static temp(target: Entity | ItemStack | World, key: string, value: any, ticks: number) {
        const prev = this.curr(target, key)
        this.set(target, key, value)
        TimeUtils.timeout(() => {
            this.set(target, key, prev)
        }, ticks)
        return DPUtils
    }

    static curr(target: Entity | ItemStack | World, key: string, placeHolder: any = undefined) {
        const raw = target.getDynamicProperty(key)
        if (raw === undefined) return placeHolder
        return JSON.parse(target.getDynamicProperty(key) as string)
    }

    static prev(target: Entity | ItemStack | World, key: string, placeHolder: any) {
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

    static sync(target: Entity | ItemStack | World, key: string) {
        target.setDynamicProperty(`${key}_prev`, target.getDynamicProperty(key))
    }
}