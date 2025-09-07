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

export class EntityOperations {
    static TARGET: Entity | undefined

    static entity(entity: Entity) {
        this.TARGET = entity
        return EntityOperations
    }

    static damage(damageId: string, source?: Entity, tags: string[] = []) {
        if (!this.TARGET) return EntityOperations
        DamageUtils.damage(damageId, this.TARGET, source, tags)
    }

    static effect(effect: string, ticks: number, options?: EntityEffectOptions) {
        if (!this.TARGET) return EntityOperations
        this.TARGET.addEffect(effect, ticks, options)
        return EntityOperations
    }

    static slowness(ticks: number, amp: number = 3, showParticles: boolean = false) {
        if (!this.TARGET) return EntityOperations
        this.TARGET.addEffect(MinecraftEffectTypes.Slowness, ticks, { amplifier: amp, showParticles: showParticles })
        return EntityOperations
    }

    static knockbackBaseView(entity: Entity, f: number, y: number = 0, r: number = 0, ticks: number = 1) {
        if (!entity) return EntityOperations
        const target = this.TARGET
        const viewEntity = entity
        TimeUtils.timeseries(() => {
            if (!target) return EntityOperations
            const unit = VecUtils.unit(VecUtils.hori(viewEntity.getViewDirection()))
            target.applyKnockback({ x: unit.x * f + unit.z * r, z: unit.z * f - unit.x * r }, y)
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }

    static knockbackBaseLoc(location: Entity | Vector3, f: number, y: number = 0, r: number = 0, ticks: number = 1) {
        if (location instanceof Entity)
            location = location.location
        const target = this.TARGET
        const loc = location
        TimeUtils.timeseries(() => {
            if (!target) return EntityOperations
            const unit = VecUtils.unit(VecUtils.hori(Vector3Utils.subtract(target.location, loc)))
            target.applyKnockback({ x: unit.x * f + unit.z * r, z: unit.z * f - unit.x * r }, y)
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }


    static rotateToDirection(direction: (target: Entity) => Vector3, ticks: number = 1) {
        const target = this.TARGET
        TimeUtils.timeseries(() => {
            if (!target) return EntityOperations
            const dir = direction(target)
            target.setRotation({ x: 0, y: MathUtils.yaw(dir.x, dir.z) })
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }

    static rotateFacing(entity: Entity, ticks: number) {
        const target = this.TARGET
        const facingEntity = entity
        TimeUtils.timeseries(() => {
            if (!target) return EntityOperations
            const locDiff = Vector3Utils.subtract(facingEntity.location, target.location)
            target.setRotation({ x: 0, y: MathUtils.yaw(locDiff.x, locDiff.z) })
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }

    static rotateToNearest(ticks: number, options?: EntityQueryOptions) {
        const target = this.TARGET
        TimeUtils.timeseries(() => {
            if (!target) return EntityOperations
            const nearest = target.dimension.getEntities({
                location: target.location,
                maxDistance: 10,
                closest: 2,
                ...options
            })
            if (nearest.length > 1) {
                const locDiff = Vector3Utils.subtract(nearest[1].location, target.location)
                target.setRotation({ x: 0, y: MathUtils.yaw(locDiff.x, locDiff.z) })
            }
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }

    static skillCooldown(skillId: string, skillCD: number, skillDuration: number) {
        if (!this.TARGET) return EntityOperations
        DPUtils.store().mob_skill_cooldown.set(this.TARGET, (cdList: { [key: string]: number }) => {
            return Object.fromEntries(
                Object.entries(cdList).map(([id,]) => [id, system.currentTick + (id === skillId ? skillCD : skillDuration)])
            )
        })
        return EntityOperations
    }

    static skillAvailable(skillId: string) {
        if (!this.TARGET) return 0
        return DPUtils.store().mob_skill_cooldown.curr(this.TARGET)[skillId] ?? 0
    }

    static setTargetedBy(entity: Entity) {
        if (!this.TARGET) return EntityOperations
        this.TARGET.addTag(TagList.TargetedBy(entity.typeId))
        return EntityOperations
    }

    static getTargets(maxDistance: number = 32) {
        if (!this.TARGET) return []
        return this.TARGET.dimension.getEntities({
            location: this.TARGET.location,
            maxDistance: maxDistance,
            tags: [TagList.TargetedBy(this.TARGET.typeId)]
        })
    }

    static triggerCombo(dpId: string, data: ComboData) {
        if (!this.TARGET) return
        const comboState: { state: number, last: number } = DPUtils.curr(this.TARGET, dpId, { state: 0, last: 0 })
        if (comboState.state >= data.length) {
            comboState.state = 0;
            comboState.last = 0
        }
        const delta = system.currentTick - comboState.last
        if (delta < data[comboState.state].duration - 1) return
        if (delta >= data[comboState.state].duration + data[comboState.state].wait) {
            comboState.state = 0
            comboState.last = system.currentTick
            data[0].callback(this.TARGET)
            DPUtils.set(this.TARGET, dpId, comboState)
            return
        }
        else {
            comboState.state = (comboState.state + 1) % data.length
            comboState.last = system.currentTick
            DPUtils.set(this.TARGET, dpId, comboState)
            data[comboState.state].callback(this.TARGET)
            return
        }
    }
}

export class EntityOperationSeries {
    private _entity: Entity
    private _steps: { tick: number; action: (entity: Entity) => void }[] = []
    private _cursor: number = 0
    private _proxy: any
    private _lastStep: { tick: number; action: (entity: Entity) => void } | undefined

    constructor(entity: Entity) {
        this._entity = entity
    }

    static for(entity: Entity) { return new EntityOperationSeries(entity)._getProxy() }

    private _getProxy() {
        if (this._proxy) return this._proxy
        const blacklist = new Set<string>(['TARGET', 'entity', 'skillAvailable', 'getTargets'])
        const self = this
        this._proxy = new Proxy(this, {
            get(target, prop: string | symbol, receiver) {
                if (typeof prop === 'string') {
                    if (prop in target) {
                        const value = (target as any)[prop]
                        return typeof value === 'function' ? value.bind(receiver) : value
                    }
                    const candidate = (EntityOperations as any)[prop]
                    if (typeof candidate === 'function' && !blacklist.has(prop)) {
                        return (...args: any[]) => {
                            const at = self._cursor
                            const step: { tick: number; action: (entity: Entity) => void } = { tick: at, action: (entity: Entity) => { (EntityOperations.entity(entity) as any)[prop](...args) } }
                            self._steps.push(step)
                            self._lastStep = step
                            return receiver
                        }
                    }
                }
                return (target as any)[prop as any]
            }
        })
        return this._proxy
    }

    wait(ticks: number): EntityOperationSeries {
        this._cursor += Math.max(0, Math.floor(ticks))
        return this
    }

    do(callback: (entity: Entity, ops: typeof EntityOperations) => void): EntityOperationSeries {
        const at = this._cursor
        const step: { tick: number; action: (entity: Entity) => void } = { tick: at, action: (entity: Entity) => callback(entity, EntityOperations.entity(entity)) }
        this._steps.push(step)
        this._lastStep = step
        return this
    }

    for(ticks: number | number[]): EntityOperationSeries {
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

    run(): EntityOperationSeries {
        this._steps.forEach(step => {
            TimeUtils.timeout(() => { step.action(this._entity) }, step.tick)
        })
        return this
    }

    start(): EntityOperationSeries { return this.run() }

    // 声明EntityUtils方法的类型（为了更好的TypeScript支持）
    damage!: (damageId: string, source?: Entity, tags?: string[]) => EntityOperationSeries
    effect!: (effect: string, ticks: number, options?: EntityEffectOptions) => EntityOperationSeries
    slowness!: (ticks: number, amp: number, showParticles: boolean) => EntityOperationSeries
    knockbackBaseView!: (entity: Entity, f: number, y?: number, r?: number, ticks?: number) => EntityOperationSeries
    knockbackBaseLoc!: (location: Entity | Vector3, f: number, y?: number, r?: number, ticks?: number) => EntityOperationSeries
    rotateToDirection!: (direction: (target: Entity) => Vector3, ticks?: number) => EntityOperationSeries
    rotateFacing!: (entity: Entity, ticks: number) => EntityOperationSeries
    rotateToNearest!: (ticks: number, options?: EntityQueryOptions) => EntityOperationSeries
    skillCooldown!: (skillId: string, skillCD: number, skillDuration: number) => EntityOperationSeries
    skillAvailable!: (skillId: string) => number


}

export class EntityQuery {
    private _entities: Entity[] = []
    private static _geometryMethodsInitialized = false
    constructor(entities: Entity[] = []) {
        this._entities = entities
        if (!EntityQuery._geometryMethodsInitialized) {
            EntityQuery.initializeGeometryMethods()
            EntityQuery._geometryMethodsInitialized = true
        }
    }

    static enumerate(entities: Entity[] = []): EntityQuery {
        return new EntityQuery(entities)
    }

    static entities(
        entity: Entity,
        maxDistance: number = 128,
        options: EntityQueryOptions = EntityUtilsOptions.Normal,
        self: boolean = false
    ): EntityQuery {
        const entities = entity.dimension.getEntities({ ...options, location: entity.location, maxDistance: maxDistance }).filter(e => self ? true : e.id !== entity.id)
        return new EntityQuery(entities)
    }

    static entitiesByType(entity: Entity, type: string, distance: number = 128): EntityQuery {
        const entities = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: distance,
            type: type,
        })
        return new EntityQuery(entities)
    }

    static entityById(id: string): EntityQuery {
        const entity = world.getEntity(id)
        return new EntityQuery(entity ? [entity] : [])
    }

    filter(predicate: (entity: Entity) => boolean): EntityQuery {
        this._entities = this._entities.filter(predicate)
        return this
    }

    // 限制数量
    limit(count: number): EntityQuery {
        this._entities = this._entities.slice(0, count)
        return this
    }

    // 获取实体数组
    get(): Entity[] {
        return this._entities
    }

    // 获取第一个实体
    first(): Entity | undefined {
        return this._entities[0]
    }

    // 获取实体数量
    count(): number {
        return this._entities.length
    }

    // 检查是否为空
    empty(): boolean {
        return this._entities.length === 0
    }

    // 声明GeometryUtils几何检测方法的类型
    sphere!: (startPoint: Vector3, radius: number) => EntityQuery
    cylinder!: (startPoint: Vector3, direction: Vector3, radius: number, length: number) => EntityQuery
    cone!: (startPoint: Vector3, direction: Vector3, angle: number, length: number) => EntityQuery
    cuboid!: (startPoint: Vector3, width: number, height: number) => EntityQuery
    rect!: (startPoint: Vector3, direction: Vector3, leftToRightLength: number, upToDownLength: number, backToFrontLength: number) => EntityQuery
    sector!: (startPoint: Vector3, direction: Vector3, height: number, angle: number, length: number) => EntityQuery

    // 动态创建GeometryUtils几何检测方法（静态执行一次）
    private static initializeGeometryMethods(): void {
        const geometryMethods = Object.getOwnPropertyNames(GeometryUtils)
            .filter(name =>
                name !== 'length' &&
                name !== 'name' &&
                name !== 'prototype' &&
                typeof (GeometryUtils as any)[name] === 'function'
            )

        geometryMethods.forEach(methodName => {
            (EntityQuery.prototype as any)[methodName] = function (this: EntityQuery, ...args: any[]) {
                this._entities = this._entities.filter(entity => {
                    return (GeometryUtils as any)[methodName](entity.location, ...args)
                })
                return this
            }
        })
    }
}

export class EntityQuerySchedule {
    private schedule: { query: EntityQuery, operation: EntityOperationSeries, tick: number }[] = []

    static create(){
        return new EntityQuerySchedule()
    }

    for(params: { query: EntityQuery, operation: EntityOperationSeries, ticks: number[] }){
        params.ticks.forEach(tick => this.schedule.push({ query: params.query, operation: params.operation, tick }))
        return this
    }

    run(){
        this.schedule.forEach(item => TimeUtils.timeout(() => { item.operation.run() }, item.tick))
    }

}