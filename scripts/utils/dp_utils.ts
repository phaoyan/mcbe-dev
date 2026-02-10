import { Entity, EntityComponentTypes, EntityEquippableComponent, EquipmentSlot, system, world, World } from "@minecraft/server";
import { dpList } from "../refs/dp_list";
import { ScriptEventIds } from "../refs/event_list";
import { dpListV2 } from "../refs/dp_list_v2";

type DPStorage = "dp" | "mem";
type DPOptions = {
    storage?: DPStorage;
};

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

        const equippables = (player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)
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
            // reducer 任务：到点后读取最新值再计算
            if (todo.r) {
                DPUtils.reduce(entity, todo.k, todo.r, todo.a, todo.p)
            } else {
                DPUtils.set(entity, todo.k, todo.v, todo.p)
            }
        }
    }
    DPUtils.store().world_dp_timeline.set(world, (curr: any) => {
        return Object.fromEntries(Object.entries(curr).filter(([k]) => parseInt(k) > system.currentTick))
    }, {})
})

export class DPUtils {

    static STORE = { ...dpList, ...dpListV2 }

    static REGISTRATION: { [key: string]: ((target: Entity | World, curr: any, prev: any) => any)[] } = {}

    // 方案 B：命名 reducer，可序列化、可持久化（重启后仍可执行）
    static REDUCERS: { [id: string]: (curr: any, args: any, target: Entity | World, key: string) => any } = {}

    // 默认内存态 key（路径 B：白名单）。仅在未显式传 options.storage 时生效。
    // 注意：这里列的是 STORE 的字段名，真正匹配时会映射成实际 dpKey 字符串。
    private static MEM_KEY_NAMES: (keyof typeof DPUtils.STORE)[] = [
        // player_is_xxx
        "player_is_jumping",
        "player_is_running",
        "player_is_sneaking",
        "player_is_swimming",
        "player_is_onground",

        // 装备位/手持/选择栏位（同样属于瞬时态）
        "player_offhand",
        "player_mainhand",
        "player_head",
        "player_chest",
        "player_legs",
        "player_feet",
        "player_selected_slot_idx",

        "player_location",

        "world_entity_death_event",
    ]

    private static MEM_KEYS: Set<string> | undefined = undefined

    // entityId -> (dpKey -> { curr, prev })
    private static MEM: Map<string, Map<string, { curr: any, prev: any }>> = new Map()

    private static memKeys(): Set<string> {
        if (!this.MEM_KEYS) {
            this.MEM_KEYS = new Set(this.MEM_KEY_NAMES.map(k => this.STORE[k]).filter(Boolean))
        }
        return this.MEM_KEYS
    }

    private static resolveOptions(key: string, options?: DPOptions): Required<DPOptions> {
        if (options?.storage) return { storage: options.storage }
        if (this.memKeys().has(key)) return { storage: "mem" }
        return { storage: "dp" }
    }

    private static shouldUseMem(target: Entity | World, key: string, options?: DPOptions): target is Entity {
        // 目前内存态只对 Entity 生效（这些 key 都是 player 瞬时态）
        if (!(target instanceof Entity)) return false
        if (!target.isValid) {
            // 无效 entity 的缓存桶顺手清掉
            this.MEM.delete(target.id)
            return false
        }
        return this.resolveOptions(key, options).storage === "mem"
    }

    private static memBucket(target: Entity) {
        let bucket = this.MEM.get(target.id)
        if (!bucket) {
            bucket = new Map()
            this.MEM.set(target.id, bucket)
        }
        return bucket
    }

    static registerReducer(
        id: string,
        reducer: (curr: any, args: any, target: Entity | World, key: string) => any
    ) {
        this.REDUCERS[id] = reducer
        return DPUtils
    }

    static reduce(target: Entity | World, key: string, reducerId: string, args?: any, placeHolder?: any, delay?: number, options?: DPOptions) {
        if (!delay) {
            const reducer = this.REDUCERS[reducerId]
            if (!reducer) {
                console.warn(`DPUtils.reduce: reducer not found: ${reducerId}`)
                return
            }
            const curr = this.curr(target, key, placeHolder, options)
            const next = reducer(curr, args, target, key)
            this.set(target, key, next, placeHolder, options)
        } else {
            // 延迟任务统一走 reducer 调度（可持久化）
            if (!(target instanceof Entity)) return
            if (typeof args === "function") {
                console.warn(`DPUtils.reduce: delay args must be serializable (got function). reducer=${reducerId}`)
                return
            }
            DPUtils.store().world_dp_timeline.set(world, (curr: any) => {
                const newTimeline = { ...curr }
                const newItem = { e: target.id, k: key, r: reducerId, a: args, p: placeHolder }
                newTimeline[system.currentTick + delay] = [...(newTimeline[system.currentTick + delay] ?? []), newItem]
                return newTimeline
            }, {})
        }
    }

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
            curr: (target: Entity | World, placeHolder?: any, options?: DPOptions) => this.curr(target, this.STORE[k as keyof typeof dpList], placeHolder, options),
            prev: (target: Entity | World, placeHolder?: any, options?: DPOptions) => this.prev(target, this.STORE[k as keyof typeof dpList], placeHolder, options),
            both: (target: Entity | World, placeHolder?: any, options?: DPOptions) => this.both(target, this.STORE[k as keyof typeof dpList], placeHolder, options),
            set: (target: Entity | World, value: any, placeHolder?: any, options?: DPOptions) => this.set(target, this.STORE[k as keyof typeof dpList], value, placeHolder, options),
            reduce: (target: Entity | World, reducerId: string, args?: any, placeHolder?: any, delay?: number, options?: DPOptions) => this.reduce(target, this.STORE[k as keyof typeof dpList], reducerId, args, placeHolder, delay, options),
            cancel: (target: Entity | World, startTick?: number) => this.cancel(target, this.STORE[k as keyof typeof dpList], startTick),
            register: (callback: (target: Entity | World, curr: any, prev: any) => any) => this.register(this.STORE[k as keyof typeof dpList], callback),
        }))
    }

    static set(target: Entity | World, key: string, value: any, placeHolder?: any, options?: DPOptions) {
        if (!target || (target instanceof Entity && !target.isValid)) return

        // 默认内存态：不写入 DP，仅保存在内存桶中（并维护 prev 语义）
        if (this.shouldUseMem(target, key, options)) {
            const bucket = this.memBucket(target)
            const old = bucket.get(key)
            const currValue = old?.curr ?? placeHolder
            const nextValue = (typeof value === "function") ? value(currValue) : value

            // 简单脏检查（瞬时态主要是 bool/number/string）
            if (old && old.curr === nextValue) return

            bucket.set(key, { prev: old?.curr, curr: nextValue })
            // 进入游戏/脚本重启后，内存态第一次写入视为初始化：不触发 register 回调
            if (!!old && (key in this.REGISTRATION)) {
                this.REGISTRATION[key].forEach(callback => callback(target, nextValue, old?.curr))
            }
            return
        }

        if (typeof value === "function") {
            const currentRaw = target.getDynamicProperty(key)
            const currentParsed = this.parseRaw(currentRaw, placeHolder)
            value = value(currentParsed)
        }

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
        if (currentRaw === newRaw) return
        // 优化：直接复用 currentRaw，避免二次序列化
        target.setDynamicProperty(`${key}_prev`, currentRaw)
        target.setDynamicProperty(key, newRaw)
        if (key in this.REGISTRATION) {
            const prevParsed = this.parseRaw(currentRaw, placeHolder)
            this.REGISTRATION[key].forEach(callback => callback(target, value, prevParsed))
        }
    }

    static cancel(target: Entity | World, key: string, startTick?: number) {
        if (!(target instanceof Entity)) return
        DPUtils.store().world_dp_timeline.set(world, (curr: any) => {
            const newTimeline = { ...curr }
            Object.keys(newTimeline).filter(t => parseInt(t) >= (startTick ?? system.currentTick)).forEach(t => {
                newTimeline[t] = newTimeline[t].filter((item: any) => !(item.e === target.id && item.k === key))
            })
            return newTimeline
        }, {})
    }

    static curr(target: Entity | World, key: string, placeHolder: any = undefined, options?: DPOptions) {
        if (!target || (target instanceof Entity && !target.isValid)) return placeHolder
        if (this.shouldUseMem(target, key, options)) {
            const bucket = this.MEM.get(target.id)
            if (!bucket) return placeHolder
            const entry = bucket.get(key)
            return entry ? entry.curr : placeHolder
        }
        const raw = target.getDynamicProperty(key)
        return this.parseRaw(raw, placeHolder)
    }

    static prev(target: Entity | World, key: string, placeHolder: any, options?: DPOptions) {
        if (!target || (target instanceof Entity && !target.isValid)) return placeHolder
        if (this.shouldUseMem(target, key, options)) {
            const bucket = this.MEM.get(target.id)
            if (!bucket) return placeHolder
            const entry = bucket.get(key)
            return entry ? entry.prev : placeHolder
        }
        return this.curr(target, `${key}_prev`, placeHolder)
    }

    static both(target: Entity | World, key: string, placeHolder: any = undefined, options?: DPOptions) {
        return {
            curr: this.curr(target, key, placeHolder, options),
            prev: this.prev(target, key, placeHolder, options),
        }
    }

    static register(key: string, callback: (target: Entity | World, curr: any, prev: any) => any) {
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

DPUtils.registerReducer("add", (curr, args) => (curr ?? 0) + args)

DPUtils.registerReducer("set", (_curr, args) => args)
DPUtils.registerReducer("flip", (curr) => !curr)