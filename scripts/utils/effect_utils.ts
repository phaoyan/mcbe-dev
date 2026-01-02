import { EasingType, Entity, Player, system, Vector3, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EntityEventIds } from "../lists/event_list";
import { MinecraftCameraPresetsTypes, MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { EntityOp, EntityState } from "./entity_utils";
import { TagList } from "../lists/tag_list";
import { animationTree } from "../refs/ref";

import { TimeUtils } from "./time_utils";

DPUtils.store().effect_refresh.register((target) => {
    if (!(target instanceof Entity)) return
    const rawState = DPUtils.store().effect_state.curr(target, {})
    const state: Record<string, { expire: number, level: number, showParticles: boolean }[]> = { ...rawState }

    // 统一清理过期项 + 排序（高等级优先）
    Object.entries(state).forEach(([effect, data]) => {
        const filtered = (data ?? [])
            .filter(item => item.expire > system.currentTick)
            .sort((a, b) => -a.level + b.level)
        if (filtered.length === 0) {
            delete state[effect]
        } else {
            state[effect] = filtered
        }
    })
    DPUtils.store().effect_state.set(target, state)

    // 应用当前最高等级，并计算“下一次必须刷新”的最早过期 tick
    let nextExpireTick: number | undefined
    Object.entries(state).forEach(([effect, data]) => {
        const currEff = (data ?? [])[0]
        if (!currEff) return
        const left = currEff.expire - system.currentTick
        TimeUtils.timeout(()=>target.addEffect(effect, left, { amplifier: currEff.level, showParticles: currEff.showParticles }), 1)
        nextExpireTick = nextExpireTick === undefined ? currEff.expire : Math.min(nextExpireTick, currEff.expire)
    })

    // 每次刷新后只保留“一条”到期刷新（最早过期那个），避免回落刷新丢失
    if (nextExpireTick !== undefined) {
        const delay = nextExpireTick - system.currentTick
        if (delay > 0) {
            DPUtils.store().effect_refresh.cancel(target, system.currentTick + 1)
            const refresh = (prev: number | undefined) => (prev ?? 0) + 1
            DPUtils.store().effect_refresh.set(target, refresh, 0, delay)
        }
    }
})


DPUtils.store().effect_superarmor.register((target, curr, prev) => {
    if (!(target instanceof Entity)) return
    if (curr) {
        target.triggerEvent(EntityEventIds.SuperArmorOn)
    } else {
        target.triggerEvent(EntityEventIds.SuperArmorOff)
    }
})

DPUtils.store().effect_dizzy.register((target, curr, prev) => {
    if (!(target instanceof Entity)) return
    if (curr) {
        if (target instanceof Player) {
            target.runCommand("inputpermission set @s movement disabled")
            target.runCommand("inputpermission set @s camera disabled")
        } else {
            target.addEffect(MinecraftEffectTypes.Slowness, 20000000, { amplifier: 255, showParticles: false })
        }
    } else {
        if (target instanceof Player) {
            target.runCommand("inputpermission set @s movement enabled")
            target.runCommand("inputpermission set @s camera enabled")
        } else {
            target.removeEffect(MinecraftEffectTypes.Slowness)
        }
    }
})

DPUtils.store().effect_move_straight.register((target, curr, prev) => {
    if (!(target instanceof Entity)) return
    if (curr) {
        target.runCommand("inputpermission set @s move_left disabled")
        target.runCommand("inputpermission set @s move_right disabled")
        target.runCommand("inputpermission set @s move_backward disabled")
    } else {
        target.runCommand("inputpermission set @s move_left enabled")
        target.runCommand("inputpermission set @s move_right enabled")
        target.runCommand("inputpermission set @s move_backward enabled")
    }
})

DPUtils.store().effect_disable_camera.register((target, curr, prev) => {
    if (!(target instanceof Entity)) return
    if (curr) {
        target.runCommand("inputpermission set @s camera disabled")
    } else {
        target.runCommand("inputpermission set @s camera enabled")
    }
})

DPUtils.store().effect_disable_movement.register((target, curr, prev) => {
    if (!(target instanceof Entity)) return
    if (curr) {
        target.runCommand("inputpermission set @s move_left disabled")
        target.runCommand("inputpermission set @s move_right disabled")
        target.runCommand("inputpermission set @s move_backward disabled")
        target.runCommand("inputpermission set @s move_forward disabled")
    } else {
        target.runCommand("inputpermission set @s move_left enabled")
        target.runCommand("inputpermission set @s move_right enabled")
        target.runCommand("inputpermission set @s move_backward enabled")
        target.runCommand("inputpermission set @s move_forward enabled")
    }
})

DPUtils.store().effect_untargetable.register((target, curr, prev) => {
    if (!(target instanceof Entity)) return
    if (target instanceof Player) return
    if (curr) {
        target.triggerEvent(EntityEventIds.UntargetableOn)
    } else {
        target.triggerEvent(EntityEventIds.UntargetableOff)
    }
})

DPUtils.store().effect_blind.register((entity, curr, prev) => {
    if (!(entity instanceof Entity)) return
    try {
        if (curr) {
            DPUtils.store().mob_target.set(entity, undefined)
            const target = EntityState.target(entity)
            if (!target) return
            target.removeTag(TagList.TargetedBy(target.typeId))
            DPUtils.store().mob_targeted_by.set(target, (curr: string[]) => (curr ?? []).filter(id => id !== target.id), [])
            entity.triggerEvent(EntityEventIds.BlindOn)
        } else {
            entity.triggerEvent(EntityEventIds.BlindOff)
            entity.triggerEvent(EntityEventIds.TargetAcquired)
        }
    } catch (e) { }
})

DPUtils.store().effect_invisible.register((entity, curr, prev) => {
    if (!(entity instanceof Entity)) return
    if (curr == "on") {
        entity.addEffect(MinecraftEffectTypes.Invisibility, 20000000, { showParticles: false })
        entity.playAnimation(animationTree.minecraft_dev.common.invisible_on)
    } else if (curr == "off_both") {
        entity.removeEffect(MinecraftEffectTypes.Invisibility)
        entity.playAnimation(animationTree.minecraft_dev.common.invisible_off)
    } else if (curr == "off_att") {
        entity.playAnimation(animationTree.minecraft_dev.common.invisible_off)
    }
})

DPUtils.store().effect_lose_target.register((entity, curr, prev) => {
    if (!(entity instanceof Entity)) return
    if (curr) {
        entity.triggerEvent(EntityEventIds.LoseTargetOn)
    } else {
        entity.triggerEvent(EntityEventIds.LoseTargetOff)
    }
})

DPUtils.store().effect_remove.register((entity, curr, prev) => {
    if (!(entity instanceof Entity)) return
    if (curr) {
        try {
            entity.remove()
        } catch (e) { }
    }
})

DPUtils.store().effect_die.register((entity, curr, prev) => {
    if (!(entity instanceof Entity)) return
    if (curr) {
        try {
            entity.triggerEvent(EntityEventIds.Death)
        } catch (e) { }
    }
})

export interface CameraMoveOptions {
    loc: Vector3
    facing: Vector3
    ease: number
}

DPUtils.store().effect_camera_set.register((player, curr, prev) => {
    if (!(player instanceof Player)) return
    if (curr !== undefined) {
        const options = curr as CameraMoveOptions
        player.camera.setCamera(MinecraftCameraPresetsTypes.Free, {
            location: options.loc,
            facingLocation: options.facing,
            easeOptions: { easeTime: options.ease, easeType: EasingType.Linear },
        })
    } else {
        player.camera.clear()
    }
})

DPUtils.store().player_camera_reset.register((player) => {
    if (!(player instanceof Player)) return
    player.camera.clear()
})

DPUtils.store().effect_camera_tpp.register((player, curr)=>{
    if (!(player instanceof Player)) return
    if (curr) {
        player.camera.setCamera(MinecraftCameraPresetsTypes.ThirdPerson)
    } else {
        player.camera.clear()
    }
})

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damage }) => {
    const absorption = DPUtils.store().effect_damage_absorption.curr(hurtEntity, false)
    if (absorption) {
        EntityOp.create().healthAbs(damage).run(hurtEntity)
    }
})