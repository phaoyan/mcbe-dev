import { Entity, Vector3 } from "@minecraft/server";
import { GeometryUtils } from "../scripts/utils/vec_utils";

/**
 * 几何检测方法 Mixin
 * 
 * 这个方案可以消除 EntityQuery 和 EntityBatch 中重复的 initializeGeometryMethods
 */

// 定义几何检测方法的接口
interface GeometryMethods {
    sphere(startPoint: Vector3, radius: number): this
    cylinder(startPoint: Vector3, direction: Vector3, radius: number, length: number): this
    cone(startPoint: Vector3, direction: Vector3, angle: number, length: number): this
    cuboid(startPoint: Vector3, width: number, height: number): this
    rect(startPoint: Vector3, direction: Vector3, leftToRightLength: number, upToDownLength: number, backToFrontLength: number): this
    sector(startPoint: Vector3, direction: Vector3, height: number, angle: number, length: number): this
}

// 几何检测 Mixin 函数
function WithGeometryMethods<T extends Constructor<{ filter: (predicate: (entity: Entity) => boolean) => any }>>(Base: T) {
    return class extends Base implements GeometryMethods {
        // 动态添加所有几何检测方法
        constructor(...args: any[]) {
            super(...args)
            this.initializeGeometryMethods()
        }

        private initializeGeometryMethods() {
            const geometryMethods = Object.getOwnPropertyNames(GeometryUtils)
                .filter(name =>
                    name !== 'length' &&
                    name !== 'name' &&
                    name !== 'prototype' &&
                    typeof GeometryUtils[name as keyof typeof GeometryUtils] === 'function'
                )

            geometryMethods.forEach(methodName => {
                if (!(this as any)[methodName]) {
                    (this as any)[methodName] = (...args: any[]) => {
                        return this.filter((entity: Entity) => {
                            return (GeometryUtils as any)[methodName](entity.location, ...args)
                        })
                    }
                }
            })
        }

        // 类型声明（实际方法通过上面动态添加）
        sphere!: (startPoint: Vector3, radius: number) => this
        cylinder!: (startPoint: Vector3, direction: Vector3, radius: number, length: number) => this
        cone!: (startPoint: Vector3, direction: Vector3, angle: number, length: number) => this
        cuboid!: (startPoint: Vector3, width: number, height: number) => this
        rect!: (startPoint: Vector3, direction: Vector3, leftToRightLength: number, upToDownLength: number, backToFrontLength: number) => this
        sector!: (startPoint: Vector3, direction: Vector3, height: number, angle: number, length: number) => this
    }
}

// 辅助类型
type Constructor<T = {}> = new (...args: any[]) => T

// 使用示例：

// 基础 EntityQuery 类（不包含几何检测方法）
class BaseEntityQuery {
    private entities: Entity[] = []

    static create(): EntityQuery {
        return new EntityQuery()
    }

    setEntities(entities: Entity[]): this {
        this.entities = entities
        return this
    }

    filter(predicate: (entity: Entity) => boolean): this {
        this.entities = this.entities.filter(predicate)
        return this
    }

    get(): Entity[] {
        return this.entities
    }
}

// 基础 EntityBatch 类（不包含几何检测方法）
class BaseEntityBatch {
    private entities: Entity[] = []

    constructor(entities: Entity[] = []) {
        this.entities = entities
    }

    filter(predicate: (entity: Entity) => boolean): this {
        this.entities = this.entities.filter(predicate)
        return this
    }

    get(): Entity[] {
        return this.entities
    }
}

// 通过 Mixin 添加几何检测功能
const EntityQuery = WithGeometryMethods(BaseEntityQuery)
const EntityBatch = WithGeometryMethods(BaseEntityBatch)

type EntityQuery = InstanceType<typeof EntityQuery>
type EntityBatch = InstanceType<typeof EntityBatch>

// 使用示例
export function mixinUsageExample(player: Entity) {
    // EntityQuery 用法
    const queryResult = EntityQuery.create()
        .setEntities([/* some entities */])
        .sphere(player.location, 10)
        .cone(player.location, player.getViewDirection(), Math.PI / 3, 15)
        .get()

    // EntityBatch 用法  
    const batchResult = new EntityBatch([/* some entities */])
        .sphere(player.location, 10)
        .cone(player.location, player.getViewDirection(), Math.PI / 3, 15)
        .get()

    console.log(`Query 找到 ${queryResult.length} 个实体`)
    console.log(`Batch 找到 ${batchResult.length} 个实体`)
}

/**
 * 优势：
 * 1. ✅ 只需要一个地方定义几何检测方法的注入逻辑
 * 2. ✅ 两个类都自动获得所有几何检测方法
 * 3. ✅ 添加新的几何检测方法时零维护
 * 4. ✅ 保持类型安全
 * 5. ✅ 符合 DRY 原则
 */