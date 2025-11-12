import { Dimension, Entity, Player, Vector3, world } from "@minecraft/server";
import { TimeUtils } from "./time_utils";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { VecUtils } from "./math_utils";
import { Vector3Utils } from "@minecraft/math";
import { EntityOp, EntityQr } from "./entity_utils";
import { DPUtils } from "./dp_utils";
import { CompUtils } from "./comp_utils";

export interface VoidbindOptions {
    duration?: number
    delay?: number
    animation?: string
    invisible?: boolean
    initRotation?: "random" | "host"
    follow?: {
        host: Entity
        offsetF?: number | ((host: Entity) => number)
        offsetY?: number | ((host: Entity) => number)
        offsetR?: number | ((host: Entity) => number)
        correction?: number
        constY?: boolean
        beforeAnimation?: boolean
        randomOffset?: number
    }
}

export class VoidbindUtils {
    static voidbind(
        entityId: string,
        dimension: Dimension,
        location: Vector3,
        options: VoidbindOptions
    ) {
        const {
            duration = 20,
            delay = 2,
            animation,
            invisible = true,
            follow,
        } = options
        const voidbind = dimension.spawnEntity(entityId, location)
        voidbind.addEffect(MinecraftEffectTypes.Invisibility, duration, { showParticles: false })
        !invisible && TimeUtils.timeout(() => voidbind.addEffect(MinecraftEffectTypes.Invisibility, 1, { amplifier: 2 }), delay)
        animation && TimeUtils.timeout(() => voidbind.playAnimation(animation), delay)
        EntityOp.create().remove(duration).run(voidbind)
        if (follow) {
            TimeUtils.timeseries(() => {
                const offsetF = typeof follow.offsetF === "function" ? follow.offsetF(follow.host) : follow.offsetF ?? 0
                const offsetY = typeof follow.offsetY === "function" ? follow.offsetY(follow.host) : follow.offsetY ?? 0
                const offsetR = typeof follow.offsetR === "function" ? follow.offsetR(follow.host) : follow.offsetR ?? 0
                const loc = Vector3Utils.add(
                    VecUtils
                        .start(follow.host)
                        .moveF(offsetF)
                        .moveY(offsetY)
                        .moveR(offsetR)
                        // 随机偏移
                        .moveF(Math.random() * (follow.randomOffset ?? 0.05))
                        .end(),
                    {
                        x: follow.host.getVelocity().x * (follow.correction ?? 6),
                        y: follow.host.getVelocity().y * (follow.correction ?? 6),
                        z: follow.host.getVelocity().z * (follow.correction ?? 6)
                    }
                )
                if (follow.constY) {
                    loc.y = location.y
                }
                if (follow.host instanceof Player) {
                    const facing = VecUtils.start(follow.host).moveF(128).moveR(Math.sign(follow.host.inputInfo.getMovementVector().x) * 128).end()
                    voidbind.teleport(loc, { facingLocation: facing })
                } else {
                    voidbind.teleport(loc, { facingLocation: VecUtils.start(follow.host).moveF(128).end() })
                }
            }, TimeUtils.ticks(1, 1, follow.beforeAnimation ? delay : duration))
        }
        return voidbind
    }

    static voidbindV2(
        entityId: string,
        dimension: Dimension,
        location: Vector3,
        options: VoidbindOptions,
        callback?: (voidbind: Entity) => void
    ) {
        const {
            duration = 20,
            delay = 2,
            animation,
            invisible = true,
            initRotation,
            follow,
        } = options
        if (initRotation === "random") {
            const rot = Math.random() * 360
            dimension.runCommand(`summon ${entityId} ${location.x} ${location.y} ${location.z} ${rot} ${rot}`)
        } else if (follow) {
            follow.host.runCommand(`summon ${entityId} ${location.x} ${location.y} ${location.z} ~ ~ `)
        } else {
            dimension.spawnEntity(entityId, location)
        }
        TimeUtils.timeout(() => {
            const voidbind = dimension.getEntities({
                location: location,
                type: entityId,
                maxDistance: 1,
            }).filter(e => !DPUtils.store().voidbind_used.curr(e, false))[0]
            if (!voidbind) return
            DPUtils.store().voidbind_used.set(voidbind, true)
            callback?.(voidbind)
            voidbind.addEffect(MinecraftEffectTypes.Invisibility, duration, { showParticles: false })
            !invisible && TimeUtils.timeout(() => voidbind.addEffect(MinecraftEffectTypes.Invisibility, 1, { amplifier: 2 }), delay)
            animation && TimeUtils.timeout(() => voidbind.playAnimation(animation), delay)
            EntityOp.create().remove(duration).run(voidbind)
            TimeUtils.timeout(() => {
                try { voidbind.remove() } catch (e) { }
            }, duration)
            if (follow) {
                TimeUtils.timeseries(() => {
                    const offsetF = typeof follow.offsetF === "function" ? follow.offsetF(follow.host) : follow.offsetF ?? 0
                    const offsetY = typeof follow.offsetY === "function" ? follow.offsetY(follow.host) : follow.offsetY ?? 0
                    const offsetR = typeof follow.offsetR === "function" ? follow.offsetR(follow.host) : follow.offsetR ?? 0
                    const loc = Vector3Utils.add(
                        VecUtils
                            .start(follow.host)
                            .moveF(offsetF)
                            .moveY(offsetY)
                            .moveR(offsetR)
                            // 随机偏移
                            .moveF(Math.random() * (follow.randomOffset ?? 0.05))
                            .end(),
                        {
                            x: follow.host.getVelocity().x * (follow.correction ?? 6),
                            y: follow.host.getVelocity().y * (follow.correction ?? 6),
                            z: follow.host.getVelocity().z * (follow.correction ?? 6)
                        }
                    )
                    if (follow.constY) {
                        loc.y = location.y
                    }
                    if (follow.host instanceof Player) {
                        const moveStraight = DPUtils.store().effect_move_straight.curr(follow.host, false)
                        const disableMovement = DPUtils.store().effect_disable_movement.curr(follow.host, false)
                        const facing = VecUtils.start(follow.host)
                            .moveF(128)
                            .moveR((moveStraight || disableMovement) ? 0 : Math.sign(follow.host.inputInfo.getMovementVector().x) * 128)
                            .end()
                        voidbind.teleport(loc, { facingLocation: facing })
                    } else {
                        voidbind.teleport(loc, { facingLocation: VecUtils.start(follow.host).moveF(128).end() })
                    }
                }, TimeUtils.ticks(1, 1, follow.beforeAnimation ? delay : duration))
            }
        }, 1)
    }

    static projForward(
        entityId: string,
        dimension: Dimension,
        location: Vector3,
        options: VoidbindOptions,
        projectileOptions: {
            knockbackF: number
            searchSize: number
            searchOffsetF: number
            hitOnDestroy?: boolean
            removeOnHit?: boolean
            flyingCallbackDelay?: number
            impulseMode?: boolean
            flyingCallback?: (voidbind: Entity) => void
            hitCallback: (voidbind: Entity, target?: Entity) => void
        },
    ) {
        const {
            duration = 20,
            delay = 2,
            follow,
        } = options

        const {
            knockbackF: knockback,
            searchSize,
            searchOffsetF,
            hitOnDestroy = true,
            removeOnHit = true,
            flyingCallbackDelay = delay,
            hitCallback,
            flyingCallback,
        } = projectileOptions
        this.voidbindV2(entityId, dimension, location, options, (voidbind) => {
            EntityOp.create()
                .at(delay)
                .knockbackBaseView(voidbind, knockback, 0, 0, duration)
                .at(duration - 1)
                .do(() => hitOnDestroy && hitCallback(voidbind))
                .do(() => { try { voidbind.remove() } catch (e) { } })
                .run(voidbind)
            TimeUtils.timeseries(() => {
                flyingCallback?.(voidbind)
            }, TimeUtils.ticks(flyingCallbackDelay, 1, duration))
            const search = EntityQr.entities(voidbind, { dist: searchSize, offset: [searchOffsetF, 0, 0], filter: e => e.id !== follow?.host.id })
            let flag = false
            const hit = EntityOp.create().do((target) => {
                if (removeOnHit && flag) return
                flag = true
                hitCallback(voidbind, target)
                if (removeOnHit) {
                    TimeUtils.timeout(() => {
                        try { voidbind.remove() } catch (e) { }
                    }, 1)
                }
            })

            search.sched(hit.callable(), TimeUtils.ticks(delay, 1, duration))
        })
    }

    static projForwardDown(
        entityId: string,
        dimension: Dimension,
        location: Vector3,
        options: VoidbindOptions,
        projectileOptions: {
            knockbackF: number
            knockbackY: number
            downThreshold: number
            searchSize: number
            searchOffsetF: number
            hitOnDestroy?: boolean
            removeOnHit?: boolean
            flyingCallbackDelay?: number
            flyingCallback?: (voidbind: Entity) => void
            hitCallback: (voidbind: Entity, target?: Entity) => void
        },
    ) {
        if (!options.follow) return
        const {
            delay = 2,
            duration = 20,
            follow
        } = options
        const {
            knockbackF,
            knockbackY,
            downThreshold,
            searchSize,
            searchOffsetF,
            hitOnDestroy = true,
            removeOnHit = true,
            flyingCallbackDelay = delay,
            flyingCallback,
            hitCallback
        } = projectileOptions
        VoidbindUtils.voidbindV2(entityId, dimension, location, options, (voidbind) => {
            EntityOp.create()
                .at(delay)
                .knockbackBaseView(follow!.host, knockbackF, knockbackY, 0, duration)
                .at(duration - 1)
                .do(() => hitOnDestroy && hitCallback(voidbind))
                .do(() => { try { voidbind.remove() } catch (e) { } })
                .run(voidbind)
            TimeUtils.timeseries(() => {
                flyingCallback?.(voidbind)
            }, TimeUtils.ticks(flyingCallbackDelay, 1, duration))
            TimeUtils.timeseries(() => {
                if (!voidbind || !voidbind.isValid) return
                const query = EntityQr.entities(voidbind, { dist: searchSize, offset: [searchOffsetF, 0, 0], filter: e => e.id !== follow!.host.id })
                if (query.get().length > 0 || voidbind.location.y < downThreshold) {
                    hitCallback(voidbind, query.get()[0])
                    if (removeOnHit) {
                        TimeUtils.timeout(() => {
                            try { voidbind.remove() } catch (e) { }
                        }, 1)
                    }
                }
            }, TimeUtils.ticks(delay, 1, duration))
        })
    }

}

world.afterEvents.entitySpawn.subscribe((event) => {
    try {
        const entity = event.entity
        if (CompUtils.typeFamily(entity).hasTypeFamily("effect")) {
            entity.addEffect(MinecraftEffectTypes.Invisibility, 2, { showParticles: false })
        }
    } catch (e) { }
})