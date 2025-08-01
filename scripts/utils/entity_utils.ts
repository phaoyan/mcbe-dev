import { Vector3Utils } from "@minecraft/math";
import { Entity, EntityDamageCause, EntityEffectOptions, EntityQueryOptions, Vector3, world } from "@minecraft/server";
import { VecUtils, GeometryUtils } from "./vec_utils";
import { DPUtils } from "./dp_utils";
import { TimeUtils } from "./time_utils";
import { MathUtils } from "./math_utils";

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
        closest: 1
    }
}




export class EntityOperations {
    static TARGET: Entity | undefined

    static entity(entity: Entity) {
        this.TARGET = entity
        return EntityOperations
    }

    static damage(amount: number, source?: Entity, tags: string[] = []) {
        if (!this.TARGET) return EntityOperations
        if (!source) {
            this.TARGET.applyDamage(amount, { cause: EntityDamageCause.entityAttack, damagingEntity: source })
            return EntityOperations
        } else {
            const attackerMultiplier = DPUtils.store().attacker_damage_multipliers.curr(source, {})
            const defenderMultiplier = DPUtils.store().defender_damage_multipliers.curr(source, {})
            let damage = amount
            tags.forEach(tag => damage *= attackerMultiplier[tag] ?? 1)
            tags.forEach(tag => damage *= defenderMultiplier[tag] ?? 1)
            damage *= attackerMultiplier.common ?? 1
            damage *= defenderMultiplier.common ?? 1
            this.TARGET.applyDamage(damage, { cause: EntityDamageCause.entityAttack, damagingEntity: source })
            return EntityOperations
        }
    }

    static effect(effect: string, ticks: number, options?: EntityEffectOptions) {
        if (!this.TARGET) return EntityOperations
        this.TARGET.addEffect(effect, ticks, options)
        return EntityOperations
    }

    static knockbackBaseView(entity: Entity, hori: number, vert: number, ticks: number = 1) {
        if (!entity) return EntityOperations
        TimeUtils.timeseries(() => {
            if (!this.TARGET) return EntityOperations
            const unit = VecUtils.unit(VecUtils.hori(entity.getViewDirection()), hori)
            this.TARGET.applyKnockback({ x: unit.x, z: unit.z }, vert)
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }

    static knockbackBaseDiff(location: Entity | Vector3, direction: "intro" | "outro", hori: number, vert: number, ticks: number = 1) {
        if (location instanceof Entity)
            location = location.location
        TimeUtils.timeseries(() => {
            if (!this.TARGET) return EntityOperations
            const locDiff =
                direction === "outro" ?
                    Vector3Utils.subtract(this.TARGET.location, location) :
                    Vector3Utils.subtract(location, this.TARGET.location)
            const unit = VecUtils.unit(VecUtils.hori(locDiff), hori)
            this.TARGET.applyKnockback({ x: unit.x, z: unit.z }, vert)
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }


    static rotateToDirection(direction: (target: Entity) => Vector3, ticks: number = 1) {
        TimeUtils.timeseries(() => {
            if (!this.TARGET) return EntityOperations
            const dir = direction(this.TARGET)
            this.TARGET.setRotation({ x: 0, y: MathUtils.yaw(dir.x, dir.z) })
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }

    static rotateFacing(entity: Entity, ticks: number) {
        TimeUtils.timeseries(() => {
            if (!this.TARGET) return EntityOperations
            const locDiff = Vector3Utils.subtract(entity.location, this.TARGET.location)
            this.TARGET.setRotation({ x: 0, y: MathUtils.yaw(locDiff.x, locDiff.z) })
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }

    static rotateToNearest(ticks: number, options?: EntityQueryOptions) {
        TimeUtils.timeseries(() => {
            if (!this.TARGET) return EntityOperations
            const nearest = this.TARGET.dimension.getEntities({
                location: this.TARGET.location,
                maxDistance: 10,
                closest: 1,
                ...options
            })
            if (nearest.length > 0) {
                const locDiff = Vector3Utils.subtract(nearest[0].location, this.TARGET.location)
                this.TARGET.setRotation({ x: 0, y: MathUtils.yaw(locDiff.x, locDiff.z) })
            }
        }, TimeUtils.ticks(1, 1, ticks))
        return EntityOperations
    }
}

export class EntityUtils {
    private _entities: Entity[] = []
    private static _methodsInitialized = false

    constructor(entities: Entity[] = []) {
        this._entities = entities
        // 只在第一次创建实例时初始化方法
        if (!EntityUtils._methodsInitialized) {
            EntityUtils.initializeBatchMethods()
            EntityUtils.initializeGeometryMethods()
            EntityUtils._methodsInitialized = true
        }
    }

    static enumerate(entities: Entity[] = []): EntityUtils {
        return new EntityUtils(entities)
    }

    /**
 * 根据条件查询实体
 */
    static entities(
        entity: Entity,
        options: EntityQueryOptions = EntityUtilsOptions.Normal,
        self: boolean = false
    ): EntityUtils {
        const entities = entity.dimension.getEntities({ ...options, location: entity.location }).filter(e => self ? true : e.id !== entity.id)
        return new EntityUtils(entities)
    }

    /**
     * 根据类型查询实体
     */
    static entitiesByType(entity: Entity, type: string, distance: number = 128): EntityUtils {
        const entities = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: distance,
            type: type,
        })
        return new EntityUtils(entities)
    }

    /**
     * 根据ID查询实体
     */
    static entityById(id: string): EntityUtils {
        const entity = world.getEntity(id)
        return new EntityUtils(entity ? [entity] : [])
    }

    // 声明EntityUtils方法的类型（为了更好的TypeScript支持）
    damage!: (amount: number, source?: Entity, tags?: string[]) => EntityUtils
    effect!: (effect: string, ticks: number, options?: EntityEffectOptions) => EntityUtils
    knockbackBaseView!: (entity: Entity, hori: number, vert: number, ticks?: number) => EntityUtils
    knockbackBaseDiff!: (location: Entity | Vector3, direction: "intro" | "outro", hori: number, vert: number, ticks?: number) => EntityUtils
    rotateToDirection!: (direction: (target: Entity) => Vector3, ticks?: number) => EntityUtils
    rotateFacing!: (entity: Entity, ticks: number) => EntityUtils
    rotateToNearest!: (ticks: number, options?: EntityQueryOptions) => EntityUtils

    // 声明GeometryUtils几何检测方法的类型
    sphere!: (startPoint: Vector3, radius: number) => EntityUtils
    cylinder!: (startPoint: Vector3, direction: Vector3, radius: number, length: number) => EntityUtils
    cone!: (startPoint: Vector3, direction: Vector3, angle: number, length: number) => EntityUtils
    cuboid!: (startPoint: Vector3, width: number, height: number) => EntityUtils
    rect!: (startPoint: Vector3, direction: Vector3, leftToRightLength: number, upToDownLength: number, backToFrontLength: number) => EntityUtils
    sector!: (startPoint: Vector3, direction: Vector3, height: number, angle: number, length: number) => EntityUtils

    // ==================== 实例查询方法（一致的API设计） ====================

    // 链式操作：对每个实体执行操作
    each(callback: (entity: Entity) => void): EntityUtils {
        this._entities.forEach(callback)
        return this
    }

    // 过滤实体
    filter(predicate: (entity: Entity) => boolean): EntityUtils {
        this._entities = this._entities.filter(predicate)
        return this
    }

    // 限制数量
    limit(count: number): EntityUtils {
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
    isEmpty(): boolean {
        return this._entities.length === 0
    }

    // 动态创建EntityUtils方法的批量版本（静态执行一次）
    private static initializeBatchMethods(): void {
        // 获取EntityUtils类的所有静态方法名
        const methodNames = Object.getOwnPropertyNames(EntityOperations)
            .filter(name =>
                name !== 'length' &&
                name !== 'name' &&
                name !== 'prototype' &&
                name !== 'TARGET' &&
                name !== 'entity' &&
                typeof EntityOperations[name as keyof typeof EntityOperations] === 'function'
            )

        // 为每个EntityUtils方法在原型上创建对应的批量方法
        methodNames.forEach(methodName => {
            EntityUtils.prototype[methodName as keyof EntityUtils] = function (this: EntityUtils, ...args: any[]) {
                this.each(entity => {
                    const entityUtils = EntityOperations.entity(entity);
                    (entityUtils as any)[methodName](...args)
                })
                return this
            } as any
        })
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
            EntityUtils.prototype[methodName as keyof EntityUtils] = function (this: EntityUtils, ...args: any[]) {
                // 使用GeometryUtils的对应方法筛选实体
                this._entities = this._entities.filter(entity => {
                    // 将实体位置作为第一个参数传入GeometryUtils方法
                    return (GeometryUtils as any)[methodName](entity.location, ...args)
                })
                return this
            } as any
        })
    }
}