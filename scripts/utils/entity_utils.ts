import { Vector3Utils } from "@minecraft/math";
import { Entity, EntityEffectOptions, EntityQueryOptions, system, Vector3, world } from "@minecraft/server";
import { VecUtils, GeometryUtils, MathUtils } from "./math_utils";
import { DPUtils } from "./dp_utils";
import { TimeUtils } from "./time_utils";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { DamageUtils } from "./damage_utils";
import { TagList } from "../lists/tag_list";

export type ComboData = {
    duration: number
    wait: number
    callback: (entity: Entity) => void
}[]

export const EntityUtilsOptions: { [key: string]: EntityQueryOptions } = {
    Normal: {
        maxDistance: 128,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
        excludeFamilies: ["projectile", "dummy"],
    },
    Dummy: {
        maxDistance: 128,
        families: ["dummy"],
    },
    Both: {
        maxDistance: 128,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
        excludeFamilies: ["projectile"],
    },
    Closest: {
        maxDistance: 128,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
        excludeFamilies: ["projectile", "dummy"],
        closest: 4
    }
}

export class EntityOperation {
    private _steps: { tick: number; action: (entity: Entity) => void }[] = []
    private _cursor: number = 0
    private _lastStep: { tick: number; action: (entity: Entity) => void } | undefined

    static create() { return new EntityOperation() }

    private _enqueue(action: (entity: Entity) => void): EntityOperation {
        const at = this._cursor
        const step: { tick: number; action: (entity: Entity) => void } = { tick: at, action }
        this._steps.push(step)
        this._lastStep = step
        return this
    }

    wait(ticks: number): EntityOperation {
        this._cursor += Math.max(0, Math.floor(ticks))
        return this
    }

    do(callback: (entity: Entity, ops: EntityOperation) => void): EntityOperation {
        return this._enqueue((entity: Entity) => callback(entity, this))
    }

    for(ticks: number | number[]): EntityOperation {
        if (!this._lastStep) return this
        const last = this._lastStep
        const lastAction: (entity: Entity) => void = last.action
        const intervals = Array.isArray(ticks) ? ticks : [ticks]
        const baseTick = last.tick
        for (const interval of intervals) {
            const dt = Math.max(0, Math.floor(interval))
            const at = baseTick + dt
            const step: { tick: number; action: (entity: Entity) => void } = { tick: at, action: lastAction }
            this._steps.push(step)
            this._lastStep = step
        }
        return this
    }

    run(entity: Entity) {
        this._steps.forEach(step => TimeUtils.timeout(() => { step.action(entity) }, step.tick))
    }

    callable() {
        return (entity: Entity) => this.run(entity)
    }

    damage(damageRate: number, source?: Entity, tags: string[] = []): EntityOperation {
        return this._enqueue((entity: Entity) => {
            DamageUtils.damage(damageRate, entity, source, tags)
        })
    }

    effect(effect: string, ticks: number, options?: EntityEffectOptions): EntityOperation {
        return this._enqueue((entity: Entity) => {
            entity.addEffect(effect, ticks, options)
        })
    }

    slowness(ticks: number, amp: number = 3, showParticles: boolean = false): EntityOperation {
        return this._enqueue((entity: Entity) => {
            entity.addEffect(MinecraftEffectTypes.Slowness, ticks, { amplifier: amp, showParticles: showParticles })
        })
    }

    knockbackBaseView(viewEntity: Entity, f: number, y: number = 0, r: number = 0, ticks: number = 1): EntityOperation {
        if (!viewEntity) return this
        return this._enqueue((entity: Entity) => {
            const facingEntity = viewEntity
            TimeUtils.timeseries(() => {
                const unit = VecUtils.unit(VecUtils.hori(facingEntity.getViewDirection()))
                entity.applyKnockback({ x: unit.x * f + unit.z * r, z: unit.z * f - unit.x * r }, y)
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    knockbackBaseLoc(location: Entity | Vector3, f: number, y: number = 0, r: number = 0, ticks: number = 1): EntityOperation {
        return this._enqueue((entity: Entity) => {
            let loc = location as Vector3
            if (location instanceof Entity) loc = location.location
            const unit = VecUtils.unit(VecUtils.hori(Vector3Utils.subtract(entity.location, loc)))
            TimeUtils.timeseries(() => {
                entity.applyKnockback({ x: unit.x * f + unit.z * r, z: unit.z * f - unit.x * r }, y)
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    rotateToDirection(direction: (target: Entity) => Vector3, ticks: number = 1): EntityOperation {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeseries(() => {
                const dir = direction(entity)
                entity.setRotation({ x: 0, y: MathUtils.yaw(dir.x, dir.z) })
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    rotateFacing(facingEntity: Entity, ticks: number): EntityOperation {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeseries(() => {
                const locDiff = Vector3Utils.subtract(facingEntity.location, entity.location)
                entity.setRotation({ x: 0, y: MathUtils.yaw(locDiff.x, locDiff.z) })
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    rotateToNearest(ticks: number, options?: EntityQueryOptions): EntityOperation {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeseries(() => {
                const nearest = entity.dimension.getEntities({
                    location: entity.location,
                    maxDistance: 10,
                    closest: 2,
                    ...options
                })
                if (nearest.length > 1) {
                    const locDiff = Vector3Utils.subtract(nearest[1].location, entity.location)
                    entity.setRotation({ x: 0, y: MathUtils.yaw(locDiff.x, locDiff.z) })
                }
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    skillCooldown(skillId: string, skillCD: number, skillDuration: number): EntityOperation {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().mob_skill_cooldown.set(entity, (cdList: { [key: string]: number }) => {
                return Object.fromEntries(
                    Object.entries(cdList).map(([id,]) => [id, system.currentTick + (id === skillId ? skillCD : skillDuration)])
                )
            })
        })
    }

    setTargetedBy(entity: Entity): EntityOperation {
        return this._enqueue((target: Entity) => {
            target.addTag(TagList.TargetedBy(entity.typeId))
            DPUtils.store().mob_targeted_by.set(target, (curr: string[])=>[...curr, entity.typeId], [])
        })
    }

    triggerCombo(dpId: string, data: ComboData): EntityOperation {
        return this._enqueue((entity: Entity) => {
            const comboState: { state: number, last: number } = DPUtils.curr(entity, dpId, { state: 0, last: 0 })
            if (comboState.state >= data.length) {
                comboState.state = 0
                comboState.last = 0
            }
            const delta = system.currentTick - comboState.last
            if (delta < data[comboState.state].duration - 1) return
            if (delta >= data[comboState.state].duration + data[comboState.state].wait) {
                comboState.state = 0
                comboState.last = system.currentTick
                data[0].callback(entity)
                DPUtils.set(entity, dpId, comboState)
                return
            } else {
                comboState.state = (comboState.state + 1) % data.length
                comboState.last = system.currentTick
                DPUtils.set(entity, dpId, comboState)
                data[comboState.state].callback(entity)
                return
            }
        })
    }

    static getTargets(entity: Entity, maxDistance: number = 32) {
        return entity.dimension.getEntities({
            location: entity.location,
            maxDistance: maxDistance,
            tags: [TagList.TargetedBy(entity.typeId)]
        })
    }

    static skillAvailable(entity: Entity, skillId: string) {
        if (!entity) return 0
        return DPUtils.store().mob_skill_cooldown.curr(entity)[skillId] ?? 0
    }
}

export class EntityQuery {
    private _query: ()=>Entity[] = () => []
    private _filters: ((entity: Entity)=>boolean)[] = []
    private _sort: (entity: Entity)=>number = () => 0
    private _limit: number = 99999
    private static _methodsInitialized = false


    constructor() {
        if (!EntityQuery._methodsInitialized) {
            EntityQuery.initializeGeometryMethods()
            EntityQuery._methodsInitialized = true
        }
    }

    static enumerate(entities: Entity[] = []): EntityQuery {
        const query = new EntityQuery()
        query._query = () => entities
        return query
    }

    static entities(
        entity: Entity,
        maxDistance: number = 128,
        options: EntityQueryOptions = EntityUtilsOptions.Normal,
        self: boolean = false
    ): EntityQuery {
        const entities = entity.dimension.getEntities({ ...options, location: entity.location, maxDistance: maxDistance }).filter(e => self ? true : e.id !== entity.id)
        return this.enumerate(entities)
    }

    static entitiesByType(entity: Entity, type: string, distance: number = 128): EntityQuery {
        const entities = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: distance,
            type: type,
        })
        return this.enumerate(entities)
    }

    static entityById(id: string): EntityQuery {
        const entities = world.getEntity(id) ? [world.getEntity(id) as Entity]: []
        return this.enumerate(entities)
    }

    filter(predicate: (entity: Entity) => boolean): EntityQuery {
        this._filters.push(predicate)
        return this
    }

    limit(limit: number): EntityQuery {
        this._limit = limit
        return this
    }

    sort(sort: (entity: Entity)=>number): EntityQuery {
        this._sort = sort
        return this
    }

    sched(callback: (entity: Entity)=>void, ticks: number[]) {
        ticks.forEach((tick)=>TimeUtils.timeout(()=>{
            let entities = this._query()
            this._filters.forEach(filter=>entities = entities.filter(filter))
            entities = entities.sort((a, b)=>this._sort(a) - this._sort(b))
            entities = entities.slice(0, this._limit)
            entities.forEach(callback)
        }, tick))
    }

    get() {
        return this._query()
    }

    first() {
        return this._query()[0]
    }

    // 动态创建GeometryUtils几何检测方法（静态执行一次）
    private static initializeGeometryMethods(): void {
        // 获取所有几何检测方法名
        const geometryMethods = Object.getOwnPropertyNames(GeometryUtils)
            .filter(name =>
                name !== 'length' &&
                name !== 'name' &&
                name !== 'prototype' &&
                typeof GeometryUtils[name as keyof typeof GeometryUtils] === 'function'
            )

        geometryMethods.forEach(methodName => {
            // 为每个GeometryUtils几何检测方法在原型上创建对应的筛选方法
            EntityQuery.prototype[methodName as keyof EntityQuery] = function (this: EntityQuery, ...args: any[]) {
                // 使用GeometryUtils的对应方法筛选实体
                this._filters.push(entity => {
                    // 将实体位置作为第一个参数传入GeometryUtils方法
                    return (GeometryUtils as any)[methodName](entity.location, ...args)
                })
                return this
            } as any
        })
    }
}