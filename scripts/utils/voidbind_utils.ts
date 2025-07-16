import { Dimension, Entity, Vector3 } from "@minecraft/server";
import { TimeUtils } from "./time_utils";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { VecUtils } from "./vec_utils";
import { Vector3Utils } from "@minecraft/math";

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
        beforeAnimation?: boolean
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
        !invisible && TimeUtils.timeout(()=>voidbind.addEffect(MinecraftEffectTypes.Invisibility, 1, {amplifier: 2}), delay)
        animation && TimeUtils.timeout(() => voidbind.playAnimation(animation), delay)
        TimeUtils.timeout(() => {try { voidbind.remove() } catch (e) { }}, duration)
        if (follow) {
            TimeUtils.timeseries(() => {
                const loc = Vector3Utils.add(
                    VecUtils
                    .start(follow.host)
                    .moveF(follow.offsetF ?? 0)
                    .moveY(follow.offsetY ?? 0)
                    .moveR(follow.offsetR ?? 0)
                    .end(),
                    Vector3Utils.scale(follow.host.getVelocity(), follow.correction ?? 6)
                )
                voidbind.teleport(loc, { rotation: follow.host.getRotation() })
            }, TimeUtils.ticks(1, 1, follow.beforeAnimation ? delay : duration))
        }
        return voidbind
    }
}