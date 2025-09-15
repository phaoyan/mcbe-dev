import { Vector3Utils } from "@minecraft/math";
import { Entity, EntityEffectOptions, EntityQueryOptions, system, Vector3, world } from "@minecraft/server";
import { VecUtils, MathUtils } from "./math_utils";
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

    at(tick: number): EntityOperation {
        this._cursor = tick
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
        return (entity: Entity) => {
            this.run(entity)
        }
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

    superarmor(ticks: number): EntityOperation {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_superarmor.cancel(entity)
            DPUtils.store().effect_superarmor.set(entity, true)
            DPUtils.store().effect_superarmor.set(entity, false, false, ticks)
        })
    }

    dizzy(ticks: number): EntityOperation {
        return this._enqueue((entity: Entity) => {
            const dir = {...entity.getViewDirection()}
            TimeUtils.timeseries(() => {
                entity.setRotation({ x: 0, y: MathUtils.yaw(dir.x, dir.z) })
            }, TimeUtils.ticks(1, 1, ticks))
            DPUtils.store().entity_sched_id.set(entity, undefined)
            DPUtils.store().effect_dizzy.cancel(entity)
            DPUtils.store().effect_dizzy.set(entity, true)
            DPUtils.store().effect_dizzy.set(entity, false, false, ticks)
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

    knockbackToPlace(location: Entity | Vector3, y: number = 0, scaler: number = 1): EntityOperation {
        return this._enqueue((entity: Entity) => {
            let loc = location as Vector3
            if (location instanceof Entity) loc = location.location
            const unit = VecUtils.unit(VecUtils.hori(Vector3Utils.subtract(loc, entity.location)), Vector3Utils.distance(entity.location, loc) * scaler)
            entity.applyKnockback({ x: unit.x, z: unit.z }, y)
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
            DPUtils.store().mob_targeted_by.set(target, (curr: string[]) => (curr ?? []).includes(entity.id) ? curr : [...(curr ?? []), entity.id], [])
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

    static target(entity: Entity) {
        const targetId = DPUtils.store().mob_target.curr(entity)
        return targetId ? world.getEntity(targetId) : undefined
    }

    static targetDist(entity: Entity) {
        const target = EntityOperation.target(entity)
        return target ? Vector3Utils.distance(entity.location, target.location) : 99999
    }

    static skillAvailable(entity: Entity, skillId: string) {
        if (!entity) return 0
        return DPUtils.store().mob_skill_cooldown.curr(entity)[skillId] ?? 0
    }
}

export class EntityQuery {
    private _target: Entity | undefined
    private _query: (target: Entity) => Entity[] = () => []
    private _sort: (entity: Entity) => number = () => 0
    private _limit: number = 99999

    static enumerate(entities: Entity[] = []): EntityQuery {
        const query = new EntityQuery()
        query._query = () => entities
        return query
    }

    static entities(
        entity: Entity,
        options: {
            dist: number
            offset?: number[] // FYR
            types?: string[]
            families?: string[]
            excludeTypes?: string[]
            excludeFamilies?: string[]
            self?: boolean
            friendlyFire?: boolean
            filter?: (entity: Entity) => boolean
        }
    ): EntityQuery {
        const {
            dist = 64,
            offset = [0, 0, 0],
            types = [],
            families = [],
            excludeTypes = ["minecraft:item", "minecraft:xp_orb"],
            excludeFamilies = ["projectile", "dummy"],
            self = false,
            friendlyFire = true,
            filter = () => true,
        } = options
        const query = new EntityQuery()
        query._target = entity
        query._query = (target: Entity) => {
            let entities: Entity[] = []
            if (types.length === 0) {
                if (families.length === 0) {
                    entities = target.dimension.getEntities({
                        location: VecUtils.start(target).moveF(offset[0]).moveY(offset[1]).moveR(offset[2]).end(),
                        maxDistance: dist,
                        excludeTypes: excludeTypes,
                        excludeFamilies: excludeFamilies,
                    })
                        .filter(e => self ? true : e.id !== target.id)
                } else {
                    entities = target.dimension.getEntities({
                        location: VecUtils.start(target).moveF(offset[0]).moveY(offset[1]).moveR(offset[2]).end(),
                        maxDistance: dist,
                        families: families,
                    })
                        .filter(e => self ? true : e.id !== target.id)
                }
            } else {
                types.forEach(type => {
                    target.dimension.getEntities({
                        location: VecUtils.start(target).moveF(offset[0]).moveY(offset[1]).moveR(offset[2]).end(),
                        maxDistance: dist,
                        type: type
                    }).forEach(e => entities.push(e))
                })
            }
            entities = entities.filter(e => self ? true : e.id !== target.id).filter(filter)
            if (!friendlyFire) {
                entities = entities.filter(e => {
                    const faction1 = DPUtils.store().entity_faction.curr(e)
                    const faction2 = DPUtils.store().entity_faction.curr(target)
                    return !faction1 || !faction2 || faction1 !== faction2
                })
            }
            return entities
        }
        return query
    }

    static entityById(id: string): EntityQuery {
        const query = new EntityQuery()
        query._query = (target: Entity) => world.getEntity(id) ? [world.getEntity(id) as Entity] : []
        return query
    }

    limit(limit: number): EntityQuery {
        this._limit = limit
        return this
    }

    sort(sort: (entity: Entity) => number): EntityQuery {
        this._sort = sort
        return this
    }

    sched(callback: (entity: Entity) => void, ticks: number[], params: any[] = []) {
        if (!this._target) return
        const schedId = system.currentTick
        DPUtils.store().entity_sched_id.set(this._target, schedId)
        TimeUtils.timeseries(() => {
            if (!this._target) return
            if (DPUtils.store().entity_sched_id.curr(this._target) !== schedId) return
            let entities = this._query(this._target)
            entities = entities.sort((a, b) => this._sort(a) - this._sort(b))
            entities = entities.slice(0, this._limit)
            entities.forEach(callback)
        }, ticks, params)
    }

    get() {
        return this._target ? this._query(this._target) : []
    }

    first() {
        return this.get()[0]
    }


}