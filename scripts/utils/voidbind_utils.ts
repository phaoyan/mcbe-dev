import { Dimension, Entity, Player, Vector3 } from "@minecraft/server";
import { TimeUtils } from "./time_utils";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { VecUtils } from "./math_utils";
import { Vector3Utils } from "@minecraft/math";
import { EntityOperation, EntityQuery } from "./entity_utils";

export interface VoidbindOptions {
    duration?: number
    delay?: number
    animation?: string
    invisible?: boolean
    follow?: {
        host: Entity
        offsetF?: number
        offsetY?: number
        offsetR?: number
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
        EntityOperation.create().remove(duration).run(voidbind)
        if (follow) {
            TimeUtils.timeseries(() => {
                const loc = Vector3Utils.add(
                    VecUtils
                        .start(follow.host)
                        .moveF(follow.offsetF ?? 0)
                        .moveY(follow.offsetY ?? 0)
                        .moveR(follow.offsetR ?? 0)
                        // 随机偏移
                        .moveF(Math.random() * (follow.randomOffset ?? 0.05))
                        .end(),
                    {
                        x: follow.host.getVelocity().x * (follow.correction ?? 6),
                        y: follow.host.getVelocity().y + (follow.correction ?? 6),
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
            follow,
        } = options
        if (follow) {
            follow.host.runCommand(`summon ${entityId} ${location.x} ${location.y} ${location.z} ~ ~ `)
        } else {
            dimension.spawnEntity(entityId, location)
        }
        TimeUtils.timeout(()=>{
            const voidbind = dimension.getEntities({
                location: location,
                type: entityId,
                maxDistance: 1,
            })[0]
            if (!voidbind) return
            callback?.(voidbind)
            voidbind.addEffect(MinecraftEffectTypes.Invisibility, duration, { showParticles: false })
            !invisible && TimeUtils.timeout(() => voidbind.addEffect(MinecraftEffectTypes.Invisibility, 1, { amplifier: 2 }), delay)
            animation && TimeUtils.timeout(() => voidbind.playAnimation(animation), delay)
            EntityOperation.create().remove(duration).run(voidbind)
            if (follow) {
                TimeUtils.timeseries(() => {
                    const loc = Vector3Utils.add(
                        VecUtils
                            .start(follow.host)
                            .moveF(follow.offsetF ?? 0)
                            .moveY(follow.offsetY ?? 0)
                            .moveR(follow.offsetR ?? 0)
                            // 随机偏移
                            .moveF(Math.random() * (follow.randomOffset ?? 0.05))
                            .end(),
                        {
                            x: follow.host.getVelocity().x * (follow.correction ?? 6),
                            y: follow.host.getVelocity().y + (follow.correction ?? 6),
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
        }, 1)
    }

}