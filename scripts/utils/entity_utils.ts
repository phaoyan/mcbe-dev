import { Vector3Utils } from "@minecraft/math";
import { Entity, EntityQueryOptions, Player, system, TeleportOptions, Vector3, world } from "@minecraft/server";
import { VecUtils, MathUtils } from "./math_utils";
import { DPUtils } from "./dp_utils";
import { TimeUtils } from "./time_utils";
import { MinecraftCameraPresetsTypes, MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { TagList } from "../refs/tag_list";
import { CompUtils } from "./comp_utils";
import { BlackboardManager } from "./behavior_utils";
import { CameraMoveOptions } from "./effect_utils";
import { ItemUtils } from "./item_utils";
import { animationLength } from "../refs/ref";

export type ComboData = {
    duration: number
    wait: number
    callback: (player: Player) => void
}[]

export class EntityState {

    static viewTarget(entity: Entity, maxDist: number = 20) {
        return entity.getEntitiesFromViewDirection({
            excludeFamilies: ["dummy", "effect"],
            maxDistance: maxDist,
        })?.[0]?.entity
    }

    static target(entity: Entity) {
        const targetId = DPUtils.store().mob_target.curr(entity)
        if (!targetId) return undefined
        const target = world.getEntity(targetId)
        if (!target || !target.isValid) {
            DPUtils.store().mob_target.set(entity, undefined)
            return undefined
        }
        return target
    }

    static targetDist(entity: Entity) {
        const target = EntityState.target(entity)
        return target ? Vector3Utils.distance(entity.location, target.location) : 99999
    }

    static targetDistRange(entity: Entity, minDist: number, maxDist: number) {
        const target = EntityState.target(entity)
        if (!target) return false
        const dist = EntityState.targetDist(entity)
        return dist >= minDist && dist <= maxDist
    }

    static targetCosineRange(entity: Entity, minCosine: number, maxCosine: number) {
        const target = EntityState.target(entity)
        if (!target) return false
        const cosine = EntityState.targetCosine(entity)
        return cosine >= minCosine && cosine <= maxCosine
    }

    static targetCosine(entity: Entity, target?: Entity) {
        target = target ?? EntityState.target(entity)
        if (!target) return 0
        const base = VecUtils.unit(VecUtils.hori(entity.getViewDirection()))
        const diff = VecUtils.unit(VecUtils.hori(Vector3Utils.subtract(target.location, entity.location)))
        const cosine = Vector3Utils.dot(base, diff)
        return cosine
    }

    static targetDizzy(entity: Entity) {
        const target = EntityState.target(entity)
        if (!target) return false
        return DPUtils.store().effect_dizzy.curr(target, false)
    }

    static skillAvailable(entity: Entity, skillId: string) {
        if (!entity) return 0
        return DPUtils.store().mob_skill_cooldowns.curr(entity)[skillId] ?? 0
    }

    static healthAbs(entity: Entity) {
        const health = CompUtils.health(entity)
        return health.currentValue
    }

    static healthPercent(entity: Entity) {
        const health = CompUtils.health(entity)
        return health.currentValue / health.effectiveMax
    }

    // 距离脚下最近的方块的高度
    static airHeight(entity: Entity, searchRange: number = 5) {
        const location = entity.location
        for (let i = 0; i < searchRange; i++) {
            const block = entity.dimension.getBlock(Vector3Utils.add(location, { y: -i }))
            if (block?.isAir) continue
            const res = entity.location.y - block!.location.y - 1
            return res
        }
        return searchRange
    }
}

export class EntityOp {
    private _steps: { tick: number; action: (entity: Entity) => void }[] = []
    private _cursor: number = 0
    private _lastStep: { tick: number; action: (entity: Entity) => void } | undefined

    static create() { return new EntityOp() }

    protected _enqueue(action: (entity: Entity) => void): EntityOp {
        const at = this._cursor
        const step: { tick: number; action: (entity: Entity) => void } = { tick: at, action }
        this._steps.push(step)
        this._lastStep = step
        return this
    }

    at(tick: number): EntityOp {
        this._cursor = tick
        return this
    }

    wait(ticks: number): EntityOp {
        this._cursor += Math.max(0, Math.floor(ticks))
        return this
    }

    do(callback: (entity: Entity, ops: EntityOp) => void, condition?: (entity: Entity) => boolean): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (condition && !condition(entity)) return
            callback(entity, this)
        })
    }

    /**
     * 将“上方的若干个动作 step”改为仅在 baseTick + intervals 触发（屏蔽原始 baseTick 触发）
     * - `repeatSteps` 默认 1：兼容旧用法
     * - `interval=0` 也只触发一次（去重）
     * - `ticks=[]` 等价于“删除上方 repeatSteps 个动作”
     */
    for(ticks: number | number[], repeatSteps: number = 1, condition?: (entity: Entity) => boolean): EntityOp {
        if (!this._lastStep) return this

        const intervals = Array.isArray(ticks) ? ticks : [ticks]
        const dtList: number[] = []
        const seen = new Set<number>()
        for (const interval of intervals) {
            const dt = Math.max(0, Math.floor(interval))
            if (seen.has(dt)) continue
            seen.add(dt)
            dtList.push(dt)
        }

        const n = Math.max(1, Math.floor(repeatSteps ?? 1))
        const targets = this._steps.slice(-n) // 从旧到新（最后 n 个）
        if (targets.length === 0) return this

        // 先移除目标 step（屏蔽它们的“原始触发”）
        const targetSet = new Set(targets)
        this._steps = this._steps.filter(s => !targetSet.has(s))

        // ticks 为空：仅删除，不新增
        if (dtList.length === 0) {
            this._lastStep = this._steps[this._steps.length - 1]
            return this
        }

        // 为每个目标 step 重新按 intervals 排队
        for (const target of targets) {
            const baseTick = target.tick
            const targetAction = target.action
            for (const dt of dtList) {
                const at = baseTick + dt
                const step: { tick: number; action: (entity: Entity) => void } = {
                    tick: at,
                    action: (entity: Entity) => {
                        if (condition && !condition(entity)) return
                        targetAction(entity)
                    }
                }
                this._steps.push(step)
                this._lastStep = step
            }
        }

        return this
    }

    run(entity: Entity | Entity[]) {
        if (Array.isArray(entity)) {
            entity.forEach(e => this.run(e))
            return
        }
        this._steps.forEach(step => TimeUtils.timeout(() => { step.action(entity) }, step.tick))
    }

    /**
     * 以“可打断调度”模式运行
     * 每一刻动作执行前都会检查 entity_sched_id 是否匹配
     */
    sched(entity: Entity | Entity[]) {
        if (Array.isArray(entity)) {
            entity.forEach(e => this.sched(e))
            return
        }
        // 生成一个唯一的调度 ID（当前 tick + 随机数）
        const schedId = system.currentTick + Math.random();
        DPUtils.store().entity_sched_id.set(entity, schedId);

        this._steps.forEach(step => TimeUtils.timeout(() => {
            // 执行前校验：如果 sched_id 不匹配，说明该调度已被覆盖或中止
            if (DPUtils.store().entity_sched_id.curr(entity) !== schedId) return;
            step.action(entity)
        }, step.tick))
    }

    callable() {
        return (entity: Entity) => {
            this.run(entity)
        }
    }

    playAnimation(animation: string, ticks: number = 0): EntityOp {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeout(() => {
                if (DPUtils.store().mob_dead.curr(entity, false)) return
                entity.playAnimation(animation)
            }, ticks)
        })
    }

    playParticle(particle: string, ticks: number[] = [0], offset: number[] = [0, 0, 0]): EntityOp {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeseries(() => {
                if (DPUtils.store().mob_dead.curr(entity, false)) return
                entity.dimension.spawnParticle(particle, Vector3Utils.add(entity.location, { x: offset[0], y: offset[1], z: offset[2] }))
            }, ticks)
        })
    }

    playSound(soundId: string, location?: Vector3, delay: number = 3, radius: number = 48): EntityOp {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeout(() => {
                entity.dimension.getPlayers().filter(p => MathUtils.distanceSquared(p.location, location ?? entity.location) <= radius ** 2).forEach(p => {
                    p.playSound(soundId, { location: location ?? entity.location })
                })
            }, delay)
        })
    }

    deadAnimation(animation: string, removeTicks?: number): EntityOp {
        removeTicks = removeTicks ?? (Math.floor((animationLength[animation as keyof typeof animationLength] ?? 1) * 20) - 1)
        return this._enqueue((entity: Entity) => {
            entity.clearVelocity()
            entity.addEffect(MinecraftEffectTypes.Slowness, 2000, { amplifier: 255, showParticles: false })
            entity.playAnimation(animation)
            EntityOp.create().dizzy(2).remove(removeTicks).run(entity)
        })
    }

    dropItems(items: { item: ItemUtils, probability: number }[], delay: number = 0): EntityOp {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeout(() => {
                items.forEach(item => {
                    if (Math.random() < item.probability) {
                        entity.dimension.spawnItem(item.item.get(), entity.location)
                    }
                })
            }, delay)
        })
    }

    damage(damageRate: number, source?: Entity): EntityOp {
        return this._enqueue((entity: Entity) => {
            const damage = Math.max(1, Math.floor(damageRate))
            entity.applyDamage(damage)
            DPUtils.store().mob_hurt_by.set(entity, source?.id)
        })
    }

    dp(dpId: string, value: any, placeHolder?: any): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.set(entity, dpId, value, placeHolder)
        })
    }

    eff(effect: string, ticks: number | null, amp: number = 0, showParticles: boolean = false): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (amp < 0) return;
            const curr = DPUtils.store().effect_state.curr(entity, {})
            const duration = (ticks ?? 20000000)
            const expireTick = system.currentTick + duration
            let data: { expire: number, level: number, showParticles: boolean }[] = curr[effect] ?? []
            // 写入时先清理过期项，避免 effect_state 无限制膨胀
            data = [...data.filter(item => item.expire > system.currentTick), {
                expire: expireTick,
                level: amp === 0 ? 1 : amp,
                showParticles: showParticles
            }].sort((a, b) => - a.level + b.level)
            DPUtils.store().effect_state.set(entity, { ...curr, [effect]: data })
            // 用自增触发刷新：避免同一 tick 内多次 eff() 因脏检查而不触发
            const refresh = (prev: number | undefined) => (prev ?? 0) + 1
            DPUtils.store().effect_refresh.set(entity, refresh, 0)
            // 过期回落的刷新由 effect_refresh.register 统一根据“最近过期时间”调度
        })
    }

    slowness(ticks: number, amp: number = 3, showParticles: boolean = false): EntityOp {
        return this._enqueue((entity: Entity) => {
            EntityOp.create().eff(MinecraftEffectTypes.Slowness, ticks, amp, showParticles).run(entity)
        })
    }

    speed(ticks: number, amp: number = 3, showParticles: boolean = false): EntityOp {
        return this._enqueue((entity: Entity) => {
            EntityOp.create().eff(MinecraftEffectTypes.Speed, ticks, amp, showParticles).run(entity)
        })
    }

    setOnFire(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            entity.setOnFire(ticks)
        })
    }

    healthAbs(change: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            const current = CompUtils.health(entity).currentValue
            const max = CompUtils.health(entity).effectiveMax
            const newCurrent = Math.floor(Math.max(0, Math.min(max, current + change)))
            CompUtils.health(entity).setCurrentValue(newCurrent)
        })
    }

    healthPct(percent: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            const current = CompUtils.health(entity).currentValue
            const max = CompUtils.health(entity).effectiveMax
            const newCurrent = Math.floor(Math.max(0, Math.min(max, current + max * percent)))
            CompUtils.health(entity).setCurrentValue(newCurrent)
        })
    }

    bleed(damage: number, ticks: number[]): EntityOp {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeseries(() => {
                damage = Math.max(1, Math.floor(damage))
                entity.applyDamage(damage)
            }, ticks)
        })
    }

    superarmor(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_superarmor.cancel(entity)
            DPUtils.store().effect_superarmor.set(entity, true)
            DPUtils.store().effect_superarmor.reduce(entity, "set", false, 0, ticks)
        })
    }

    // 伤害吸收：指实体受到伤害后立刻恢复到原来的血量，在伤害吸收条件下可以记录累计受到的伤害，用于一些反伤计算
    damageAbsorption(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_damage_absorption.cancel(entity)
            DPUtils.store().effect_damage_absorption.set(entity, true)
            DPUtils.store().effect_damage_absorption.reduce(entity, "set", false, 0, ticks)
        })
    }

    dizzy(ticks: number, interrupt?: boolean): EntityOp {
        interrupt = interrupt ?? true
        return this._enqueue((entity: Entity) => {
            const dir = { ...entity.getViewDirection() }
            TimeUtils.timeseries(() => {
                entity.setRotation({ x: 0, y: MathUtils.yaw(dir.x, dir.z) })
            }, TimeUtils.ticks(1, 1, ticks))
            interrupt && DPUtils.store().entity_sched_id.set(entity, undefined)
            DPUtils.store().effect_dizzy.cancel(entity)
            DPUtils.store().effect_dizzy.set(entity, true)
            DPUtils.store().effect_dizzy.reduce(entity, "set", false, 0, ticks)
        })
    }

    moveStraight(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_move_straight.cancel(entity)
            if (ticks === 0) return
            DPUtils.store().effect_move_straight.set(entity, true)
            DPUtils.store().effect_move_straight.reduce(entity, "set", false, 0, ticks)
        })
    }

    disableMovement(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_disable_movement.cancel(entity)
            ticks !== 0 && DPUtils.store().effect_disable_movement.set(entity, true)
            DPUtils.store().effect_disable_movement.reduce(entity, "set", false, 0, ticks)
        })
    }

    disableCamera(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_disable_camera.cancel(entity)
            DPUtils.store().effect_disable_camera.set(entity, true)
            DPUtils.store().effect_disable_camera.reduce(entity, "set", false, 0, ticks)
        })
    }

    cameraThirdPerson(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (entity instanceof Player) {
                TimeUtils.timeout(() => {
                    entity.camera.setCamera(MinecraftCameraPresetsTypes.ThirdPerson)
                }, ticks)
            }
        })
    }

    cameraTpp(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (entity instanceof Player) {
                DPUtils.store().effect_camera_tpp.cancel(entity)
                DPUtils.store().effect_camera_tpp.set(entity, true)
                DPUtils.store().effect_camera_tpp.reduce(entity, "set", false, 0, ticks)
            }
        })
    }

    cameraShake(ticks: number, intensity: number, mode: "positional" | "rotational"): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (entity instanceof Player) {
                entity.runCommand(`camerashake add @s ${intensity} ${ticks / 20}  ${mode}`)
            }
        })
    }

    cameraSet(
        loc: Vector3 | ((entity: Entity) => Vector3), 
        facing?: Vector3 | ((entity: Entity) => Vector3), 
        ease?: number,
        reset?: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_camera_set.set(entity, { loc: typeof loc === "function" ? loc(entity) : loc, facing: typeof facing === "function" ? facing(entity) : facing ?? entity.getHeadLocation(), ease: ease ?? 0.1, seed: Math.random() }, undefined)
            if (reset) {
                EntityOp.create().at(1).cameraReset(Math.ceil(reset * 20)).run(entity)
            }
        })
    }

    cameraMove(data: { options: CameraMoveOptions, moment: number }[]): EntityOp {
        return this._enqueue((entity: Entity) => {
            data.forEach((item) => {
                DPUtils.store().effect_camera_set.reduce(entity, "set", item.options, undefined, item.moment)
            })
            DPUtils.store().effect_camera_set.reduce(entity, "set", undefined, undefined, data[data.length - 1].moment + 1)
        })
    }

    cameraSlide(start: Vector3, end: Vector3, ticks: number, facing?: Vector3): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (!(entity instanceof Player)) return
            const f = facing ?? end
            EntityOp.create()
                .cameraSet(() => start, () => f, 0)
                .at(1)
                .cameraSet(() => end, () => f, ticks / 20)
                .run(entity)
        })
    }

    cameraSlideMultiple(locs: { start: Vector3, end: Vector3, moment: number }[], facing: Vector3): EntityOp {
        let lastMoment = 0
        locs.forEach((segment) => {
            const duration = segment.moment - lastMoment
            if (duration > 0) {
                this.at(lastMoment).cameraSlide(segment.start, segment.end, duration, facing)
            }
            lastMoment = segment.moment
        })
        this.cameraReset(locs[locs.length - 1].moment + 1)
        return this
    }

    cameraBack(base: number, scaler: number, ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (!(entity instanceof Player)) return
            const view = entity.getViewDirection()
            const data = TimeUtils.ticks(1, 1, ticks).map((tick) => {
                const loc = Vector3Utils.subtract(entity.getHeadLocation(), Vector3Utils.scale(view, base + scaler * tick))
                return { options: { loc, facing: entity.getHeadLocation(), ease: 0.1 }, moment: tick }
            })
            EntityOp.create().cameraMove(data).run(entity)
        })
    }

    cameraBackForward(base: number, scaler: number, backTicks: number, stopTicks: number, forwardTicks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (!(entity instanceof Player)) return
            const view = entity.getViewDirection()
            const data = TimeUtils.ticks(1, 1, backTicks + stopTicks + forwardTicks).map((tick, idx) => {
                const headLoc = entity.getHeadLocation()
                const loc =
                    idx < backTicks ? Vector3Utils.subtract(headLoc, Vector3Utils.scale(view, base + scaler * tick)) :
                        idx < backTicks + stopTicks ? Vector3Utils.subtract(headLoc, Vector3Utils.scale(view, base + scaler * backTicks)) :
                            Vector3Utils.subtract(headLoc, Vector3Utils.scale(view, base + scaler * backTicks - scaler * (tick - stopTicks - backTicks) * backTicks / forwardTicks))
                return { options: { loc, facing: headLoc, ease: 0.1 }, moment: tick }
            })
            EntityOp.create().cameraMove(data).run(entity)
        })
    }

    cameraReset(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (entity instanceof Player) {
                DPUtils.store().effect_camera_set.cancel(entity)
                DPUtils.store().player_camera_reset.reduce(entity, "flip", false, 0, ticks)
            }
        })
    }

    untargetable(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_untargetable.cancel(entity)
            DPUtils.store().effect_untargetable.set(entity, true)
            DPUtils.store().effect_untargetable.reduce(entity, "set", false, 0, ticks)
        })
    }

    invisible(ticks: number, removeEffect: boolean = true): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_invisible.cancel(entity)
            DPUtils.store().effect_invisible.set(entity, "on")
            DPUtils.store().effect_invisible.reduce(entity, "set", removeEffect ? "off_both" : "off_att", false, ticks)
        })
    }

    blind(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (entity instanceof Player) {
                entity.addEffect(MinecraftEffectTypes.Blindness, ticks, { amplifier: 255, showParticles: false })
            } else {
                DPUtils.store().effect_blind.cancel(entity)
                DPUtils.store().effect_blind.set(entity, true)
                DPUtils.store().effect_blind.reduce(entity, "set", false, 0, ticks)
            }
        })
    }

    loseTarget(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_lose_target.cancel(entity)
            DPUtils.store().effect_lose_target.set(entity, true)
            DPUtils.store().effect_lose_target.reduce(entity, "set", false, 0, ticks)
        })
    }


    remove(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_remove.reduce(entity, "set", true, 0, ticks)
        })
    }

    die(ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().effect_die.reduce(entity, "set", true, 0, ticks)
        })
    }

    rmEff(effect: string): EntityOp {
        return this._enqueue((entity: Entity) => {
            if (
                effect === "superarmor"
            ) {
                DPUtils.store().effect_superarmor.cancel(entity)
                DPUtils.store().effect_superarmor.set(entity, false)
            }
            else if (
                effect === "dizzy"
            ) {
                DPUtils.store().effect_dizzy.cancel(entity)
                DPUtils.store().effect_dizzy.set(entity, false)
            }
            else if (
                effect === "blind"
            ) {
                DPUtils.store().effect_blind.cancel(entity)
                DPUtils.store().effect_blind.set(entity, false)
            }
            else if (
                effect === "untargetable"
            ) {
                DPUtils.store().effect_blind.cancel(entity)
                DPUtils.store().effect_blind.set(entity, false)
            }
            else {
                entity.removeEffect(effect)
                DPUtils.store().effect_state.set(entity, { ...DPUtils.store().effect_state.curr(entity, {}), [effect]: [] })
            }
        })
    }

    // 在技能释放前配置一些通用的效果，包括减速、定向、霸体
    preskill(ticks: {
        slowness?: number
        rotation?: number
        superarmor?: number
    }, options?: {
        slownessLvl?: number
        rotationMode?: "fixed" | "facingTarget"
    }) {
        const { slownessLvl = 5, rotationMode = "fixed" } = options ?? {}
        return this._enqueue((entity: Entity) => {
            let ops = EntityOp.create()
            if (ticks.slowness) ops = ops.slowness(ticks.slowness, slownessLvl, false)
            if (ticks.superarmor) ops = ops.superarmor(ticks.superarmor)
            if (ticks.rotation) {
                const direction = entity.getViewDirection()
                rotationMode === "fixed" && ops.rotateToDirection(() => direction, ticks.rotation)
                const target = EntityState.target(entity)
                !!target && rotationMode === "facingTarget" && ops.rotateFacing(target, ticks.rotation)
            }
            ops.run(entity)
        })
    }

    knockbackBaseView(viewEntity: Entity, f: number, y: number = 0, r: number = 0, ticks: number = 1): EntityOp {
        if (!viewEntity) return this
        return this._enqueue((entity: Entity) => {
            const facingEntity = viewEntity
            TimeUtils.timeseries(() => {
                const unit = VecUtils.unit(VecUtils.hori(facingEntity.getViewDirection()))
                entity.applyKnockback({ x: unit.x * f + unit.z * r, z: unit.z * f - unit.x * r }, y)
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    knockbackBaseLoc(location: Entity | Vector3 | ((entity: Entity) => Vector3), f: number, y: number = 0, r: number = 0, ticks: number = 1): EntityOp {
        return this._enqueue((entity: Entity) => {
            let loc = typeof location === "function" ? location(entity) : (location as Vector3)
            if (location instanceof Entity) loc = location.location
            const unit = VecUtils.unit(VecUtils.hori(Vector3Utils.subtract(entity.location, loc)))
            TimeUtils.timeseries(() => {
                entity.applyKnockback({ x: unit.x * f + unit.z * r, z: unit.z * f - unit.x * r }, y)
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    knockbackToPlace(location: Entity | Vector3 | ((entity: Entity) => Vector3), y: number = 0, scaler: number = 1): EntityOp {
        return this._enqueue((entity: Entity) => {
            let loc = typeof location === "function" ? location(entity) : (location as Vector3)
            if (location instanceof Entity) loc = location.location
            const unit = VecUtils.unit(VecUtils.hori(Vector3Utils.subtract(loc, entity.location)), Vector3Utils.distance(entity.location, loc) * scaler)
            entity.applyKnockback({ x: unit.x, z: unit.z }, y)
        })
    }

    knockbackToAir(data: {
        y: number
        f?: number
        duration: number
        delay?: number,
        airf?: number
    }): EntityOp {
        const { y, f = 0, duration, delay = 5, airf = 0.05 } = data
        return this._enqueue((entity: Entity) => {
            EntityOp.create().knockbackBaseView(entity, f, y).at(delay).knockbackBaseView(entity, airf, 0.05, 0, duration - delay).run(entity)
        })
    }

    impulse(vec: Vector3): EntityOp {
        return this._enqueue((entity: Entity) => {
            entity.applyImpulse(vec)
        })
    }

    impulseBaseView(viewEntity: Entity, strength: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            const facingEntity = viewEntity
            entity.applyImpulse(VecUtils.unit(facingEntity.getViewDirection(), strength))
        })
    }

    impulseBaseLoc(location: Entity | Vector3, strength: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            const loc = location instanceof Entity ? location.location : location
            const unit = VecUtils.unit(VecUtils.hori(Vector3Utils.subtract(loc, entity.location)))
            entity.applyImpulse(VecUtils.unit(unit, strength))
        })
    }

    impulseToPlace(location: Entity | Vector3, scaler: number = 1, scalerY: number = 1): EntityOp {
        return this._enqueue((entity: Entity) => {
            const loc = location instanceof Entity ? location.location : location
            const unit = {
                x: (loc.x - entity.location.x) * scaler,
                y: (loc.y - entity.location.y) * scaler * scalerY,
                z: (loc.z - entity.location.z) * scaler
            }
            entity.applyImpulse(unit)
        })
    }

    rotateToDirection(direction: (target: Entity) => Vector3, ticks: number = 1): EntityOp {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeseries(() => {
                const dir = direction(entity)
                entity.setRotation({ x: 0, y: MathUtils.yaw(dir.x, dir.z) })
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    rotateFacing(facingEntity: Entity, ticks: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            TimeUtils.timeseries(() => {
                const locDiff = Vector3Utils.subtract(facingEntity.location, entity.location)
                entity.setRotation({ x: 0, y: MathUtils.yaw(locDiff.x, locDiff.z) })
            }, TimeUtils.ticks(1, 1, ticks))
        })
    }

    rotateToNearest(ticks: number, options?: EntityQueryOptions): EntityOp {
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

    teleport(location: Entity | Vector3 | ((entity: Entity) => Vector3), options?: TeleportOptions): EntityOp {
        return this._enqueue((entity: Entity) => {
            let loc = typeof location === "function" ? location(entity) : (location as Vector3)
            if (location instanceof Entity) loc = location.location
            entity.teleport(loc, options)
        })
    }

    tp(data: (entity: Entity) => { loc: Vector3, facing?: Vector3 }): EntityOp {
        return this._enqueue((entity: Entity) => {
            const { loc, facing } = data(entity)
            entity.teleport(loc, { facingLocation: facing ?? entity.getHeadLocation() })
        })
    }

    skillCooldown(skillId: string, skillCD: number, skillDuration: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().mob_skill_cooldowns.set(entity, (cdList: { [key: string]: number }) => {
                return Object.fromEntries(
                    Object.entries(cdList).map(([id,]) => [id, system.currentTick + (id === skillId ? skillCD : skillDuration)])
                )
            })
        })
    }

    setTargetedBy(entity: Entity): EntityOp {
        return this._enqueue((target: Entity) => {
            target.addTag(TagList.TargetedBy(entity.typeId))
            DPUtils.store().mob_targeted_by.set(target, (curr: string[]) => (curr ?? []).includes(entity.id) ? curr : [...(curr ?? []), entity.id], [])
        })
    }

    resetSkill(): EntityOp {
        return this._enqueue((target: Entity) => {
            BlackboardManager.set(target, 'skill_locking', system.currentTick - 1);
        })
    }

    triggerSkill(skillId: string): EntityOp {
        return this._enqueue((entity: Entity) => {
            BlackboardManager.set(entity, 'trigger_skill_id', skillId);
        })
    }

    triggerCombo(params: {
        dpId: string, data: ComboData, comboStop?: (entity: Player) => void
    }): EntityOp {
        const { dpId, data, comboStop } = params
        return this._enqueue((entity: Entity) => {
            if (!(entity instanceof Player)) return
            const cooldown = DPUtils.store().player_combo_cooldown.curr(entity, 0)
            if (system.currentTick < cooldown) return
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
            } else {
                comboState.state = (comboState.state + 1) % data.length
                comboState.last = system.currentTick
                DPUtils.set(entity, dpId, comboState)
                data[comboState.state].callback(entity)
                if (comboState.state === data.length - 1) {
                    DPUtils.store().player_combo_cooldown.set(entity, system.currentTick + data[comboState.state].duration + data[comboState.state].wait)
                }
            }
            if (comboStop) {
                DPUtils.store().player_combo_stop.set(entity, system.currentTick + data[comboState.state].duration + data[comboState.state].wait)
                TimeUtils.timeout(() => {
                    const stop = DPUtils.store().player_combo_stop.curr(entity, 0)
                    if (system.currentTick < stop) return
                    comboStop(entity)
                }, data[comboState.state].duration + data[comboState.state].wait)
            }
        })
    }

    setFaction(faction: string): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().entity_faction.set(entity, faction)
        })
    }

    inputLock(types: string[], ticks?: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().player_input_lock.set(entity, types)
            ticks && DPUtils.store().player_input_lock.reduce(entity, "set", undefined, false, ticks)
        })
    }

    inputUnlock(ticks?: number): EntityOp {
        return this._enqueue((entity: Entity) => {
            DPUtils.store().player_input_lock.reduce(entity, "set", undefined, false, ticks ?? 0)
        })
    }

    spawnEntity(type: string, location: Vector3, delay: number = 40, callback?: (entity: Entity) => void): EntityOp {
        return this._enqueue((entity: Entity) => {
            const id = `spawn_entity_${system.currentTick}_${Math.random().toString(36).substring(2, 15)}`
            entity.dimension.runCommand(`tickingarea add circle ${location.x} ${location.y} ${location.z} 1 ${id} true`)
            
            const attemptSummon = (retryCount: number) => {
                if (retryCount >= 16) return;
                
                TimeUtils.timeout(() => {
                    const result = entity.dimension.runCommand(`summon ${type} ${location.x} ${location.y} ${location.z} ~ ~`)
                    if (result.successCount === 0) {
                        attemptSummon(retryCount + 1);
                    } else {
                        TimeUtils.timeout(()=>{
                            entity.dimension.getEntities({
                                location: location,
                                type: type,
                                maxDistance: 4,
                            })
                            .forEach(e => {
                                if (e.isValid) {
                                    callback?.(e)
                                }
                            })
                        }, 2)
                    }
                }, delay);
            };

            attemptSummon(0);
            TimeUtils.timeout(() => entity.dimension.runCommand(`tickingarea remove ${id}`), (delay * 5) + 10)
        })
    }

    spawnEntities(entities: { type: string, location: Vector3 }[], force: boolean = true): EntityOp {
        return this._enqueue((entity: Entity) => {
            const location = entities[0].location
            if (force) {
                const id = `spawn_entity_${system.currentTick}_${Math.random().toString(36).substring(2, 15)}`
                entity.dimension.runCommand(`tickingarea add circle ${location.x} ${location.y} ${location.z} 1 ${id}`)
                TimeUtils.timeout(()=>{
                    entities.forEach(e => {
                        entity.dimension.runCommand(`summon ${e.type} ${e.location.x} ${e.location.y} ${e.location.z} ~ ~`)
                    })
                },4)
                TimeUtils.timeout(() => entity.dimension.runCommand(`tickingarea remove ${id}`), 20)
            } else {
                entities.forEach(e => {
                    entity.dimension.runCommand(`summon ${e.type} ${e.location.x} ${e.location.y} ${e.location.z} ~ ~`)
                })
            }
        })
    }

    despawnEntity(options: EntityQueryOptions): EntityOp {
        return this._enqueue((entity: Entity) => {
            const center = (() => {
                if (options && "location" in options && options.location) return options.location;
                if (entity && (entity as any).location) return (entity as any).location;
                return { x: 0, y: 0, z: 0 }
            })();

            const id = `despawn_entity_${system.currentTick}_${Math.random().toString(36).substring(2, 15)}`
            entity.dimension.runCommand(`tickingarea add circle ${center.x} ${center.y} ${center.z} 1 ${id} true`)

            const attemptDespawn = (retryCount: number) => {
                if (retryCount >= 16) {
                    entity.dimension.runCommand(`tickingarea remove ${id}`)
                    return;
                }

                TimeUtils.timeout(() => {
                    const entities = entity.dimension.getEntities(options)
                    if (entities.length === 0) {
                        // Already despawned (or not found)
                        entity.dimension.runCommand(`tickingarea remove ${id}`)
                        return;
                    }
                    let removed = 0;
                    entities.forEach(e => {
                        if (e.isValid) {
                            try { e.remove(); removed++; } catch {}
                        }
                    });
                    if (removed === 0) {
                        // Try again if nothing was removed
                        attemptDespawn(retryCount + 1)
                    } else {
                        entity.dimension.runCommand(`tickingarea remove ${id}`)
                    }
                }, 10);
            };

            attemptDespawn(0)
        })
    }

    actionBar(message: string): EntityOp {
        return this._enqueue((entity: Entity) => {
            (entity as Player).onScreenDisplay.setActionBar(message)
        })
    }
}

export interface EntityQueryParams {
    dist: number
    location?: Vector3
    offset?: number[] // FYR
    types?: string[]
    families?: string[]
    excludeTypes?: string[]
    excludeFamilies?: string[]
    self?: boolean
    friendlyFire?: boolean
    limit?: number
    ignoreUntargetable?: boolean
    filter?: (entity: Entity) => boolean
}

export class EntityQr {
    private _target: Entity | undefined
    private _query: (target: Entity) => Entity[] = () => []
    private _sort: (entity: Entity) => number = () => 0
    private _limit: number = 99999

    static enumerate(entities: Entity[] = []): EntityQr {
        const query = new EntityQr()
        query._query = () => entities
        return query
    }

    static entities(
        entity: Entity,
        options: EntityQueryParams | EntityQueryParams[]
    ): EntityQr {
        if (!Array.isArray(options)) {
            options = [options]
        }

        const query = new EntityQr()
        query._target = entity
        query._query = (target: Entity) => {
            if (!target.isValid) return []
            const res: Entity[] = []
            options.forEach((option) => {
                const {
                    dist = 64,
                    location = undefined,
                    offset = [0, 0, 0],
                    types = [],
                    families = [],
                    excludeTypes = ["minecraft:item", "minecraft:xp_orb"],
                    excludeFamilies = ["projectile", "dummy"],
                    self = false,
                    friendlyFire = false,
                    filter = () => true,
                    limit = 99999,
                    ignoreUntargetable = false,
                } = option

                let entities: Entity[] = []
                if (types.length === 0) {
                    if (families.length === 0) {
                        entities = target.dimension.getEntities({
                            location: location ? location : VecUtils.start(target).moveF(offset[0]).moveY(offset[1]).moveR(offset[2]).end(),
                            maxDistance: dist,
                            excludeTypes: excludeTypes,
                            excludeFamilies: excludeFamilies,
                        })
                            .filter(e => self ? true : e.id !== target.id)
                    } else {
                        entities = target.dimension.getEntities({
                            location: location ? location : VecUtils.start(target).moveF(offset[0]).moveY(offset[1]).moveR(offset[2]).end(),
                            maxDistance: dist,
                            families: families,
                        })
                            .filter(e => self ? true : e.id !== target.id)
                    }
                } else {
                    types.forEach(type => {
                        target.dimension.getEntities({
                            location: location ? location : VecUtils.start(target).moveF(offset[0]).moveY(offset[1]).moveR(offset[2]).end(),
                            maxDistance: dist,
                            type: type
                        }).forEach(e => entities.push(e))
                    })
                }
                entities = entities.filter(filter)
                    .filter(e => self ? true : e.id !== target.id)
                    .filter(e => ignoreUntargetable ? true : !DPUtils.store().effect_untargetable.curr(e, false))
                    .filter(e => !e.hasComponent("minecraft:npc"))
                    .slice(0, limit)
                if (!friendlyFire) {
                    entities = entities.filter(e => {
                        const faction1 = DPUtils.store().entity_faction.curr(e)
                        const faction2 = DPUtils.store().entity_faction.curr(target)
                        return !faction1 || !faction2 || faction1 !== faction2
                    })
                }

                res.push(...entities)
            })
            return res
        }
        return query
    }

    static entityById(id: string): EntityQr {
        const query = new EntityQr()
        query._query = (target: Entity) => world.getEntity(id) ? [world.getEntity(id) as Entity] : []
        query._target = world.getEntity(id) as Entity
        return query
    }

    limit(limit: number): EntityQr {
        this._limit = limit
        return this
    }

    sort(sort: (entity: Entity) => number): EntityQr {
        this._sort = sort
        return this
    }

    sched(callback: (entity: Entity, param: any, index: number, base?: Entity) => void, ticks: number[], params: any[] = []) {
        if (!this._target) return
        const schedId = system.currentTick
        DPUtils.store().entity_sched_id.set(this._target, schedId)
        TimeUtils.timeseries((param, index) => {
            if (!this._target) return
            if (DPUtils.store().entity_sched_id.curr(this._target) !== schedId) return
            let entities = this._query(this._target)
            entities = entities.sort((a, b) => this._sort(a) - this._sort(b))
            entities = entities.slice(0, this._limit)
            entities.forEach(e => callback(e, param, index, this._target))
        }, ticks, params)
    }

    get() {
        return this._target ? this._query(this._target) : []
    }

    first() {
        return this.get()[0]
    }


}

export class EntityUtils {

    static sched(data: {
        op: EntityOp,
        qr: EntityQr,
        tk: number[],
    }[] | {
        op: EntityOp,
        qr: EntityQr,
        tk: number[],
    }) {
        if (!Array.isArray(data)) {
            data = [data]
        }
        data.forEach(item => {
            item.qr.sched(item.op.callable(), item.tk)
        })
        return this
    }
}