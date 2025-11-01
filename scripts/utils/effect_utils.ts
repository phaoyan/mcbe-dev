import { EasingType, Entity, Player, Vector3, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EntityEventIds } from "../lists/event_list";
import { MinecraftCameraPresetsTypes, MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { EntityOperation, EntityState } from "./entity_utils";
import { TagList } from "../lists/tag_list";
import animationTree from "../json/animation_tree.json";

DPUtils.store().effect_superarmor.register((target, curr, prev)=>{
    if (!(target instanceof Entity)) return
    if (curr) {
        target.triggerEvent(EntityEventIds.SuperArmorOn)
    } else {
        target.triggerEvent(EntityEventIds.SuperArmorOff)
    }
})

DPUtils.store().effect_dizzy.register((target, curr, prev)=>{
    if (!(target instanceof Entity)) return
    if (curr) {
        if (target instanceof Player) {
            target.runCommand("inputpermission set @s movement disabled")
            target.runCommand("inputpermission set @s camera disabled")
        } else {
            target.addEffect(MinecraftEffectTypes.Slowness, 20000000, { amplifier: 255, showParticles: false})
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

DPUtils.store().effect_move_straight.register((target, curr, prev)=>{
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

DPUtils.store().effect_disable_camera.register((target, curr, prev)=>{
    if (!(target instanceof Entity)) return
    if (curr) {
        target.runCommand("inputpermission set @s camera disabled")
    } else {
        target.runCommand("inputpermission set @s camera enabled")
    }
})

DPUtils.store().effect_disable_movement.register((target, curr, prev)=>{
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

DPUtils.store().effect_untargetable.register((target, curr, prev)=>{
    if (!(target instanceof Entity)) return
    if (curr) {
        target.triggerEvent(EntityEventIds.UntargetableOn)
    } else {
        target.triggerEvent(EntityEventIds.UntargetableOff)
    }
})

DPUtils.store().effect_blind.register((entity, curr, prev)=>{
    if (!(entity instanceof Entity)) return
    try {
        if (curr) {
            console.warn("blind on", entity.typeId)
            DPUtils.store().mob_target.set(entity, undefined)
            const target = EntityState.target(entity)
            if (!target) return
            target.removeTag(TagList.TargetedBy(target.typeId))
            DPUtils.store().mob_targeted_by.set(target, (curr: string[]) => (curr ?? []).filter(id => id !== target.id), [])
            entity.triggerEvent(EntityEventIds.BlindOn)
        } else {
            console.warn("blind off", entity.typeId)
            entity.triggerEvent(EntityEventIds.BlindOff)
            entity.triggerEvent(EntityEventIds.TargetAcquired)
        }
    } catch (e) {}
})

DPUtils.store().effect_invisible.register((entity, curr, prev)=>{
    if (!(entity instanceof Entity)) return
    if (curr=="on") {
        entity.addEffect(MinecraftEffectTypes.Invisibility, 20000000, { showParticles: false})
        entity.playAnimation(animationTree.minecraft_dev.common.invisible_on)
    } else if (curr=="off_both") {
        entity.removeEffect(MinecraftEffectTypes.Invisibility)
        entity.playAnimation(animationTree.minecraft_dev.common.invisible_off)
    } else if (curr=="off_att") {
        entity.playAnimation(animationTree.minecraft_dev.common.invisible_off)
    }
})

DPUtils.store().effect_lose_target.register((entity, curr, prev)=>{
    if (!(entity instanceof Entity)) return
    if (curr) {
        entity.triggerEvent(EntityEventIds.LoseTargetOn)
    } else {
        entity.triggerEvent(EntityEventIds.LoseTargetOff)
    }
})

DPUtils.store().effect_remove.register((entity, curr, prev)=>{
    if (!(entity instanceof Entity)) return
    if (curr) {
        try {
            entity.remove()
        } catch (e) {}
    }
})

DPUtils.store().effect_die.register((entity, curr, prev)=>{
    if (!(entity instanceof Entity)) return
    if (curr) {
        try {
            entity.triggerEvent(EntityEventIds.Death)
        } catch (e) {}
    }
})

export interface CameraMoveOptions {
    loc: Vector3
    facing: Vector3
    ease: number
}

DPUtils.store().effect_camera_set.register((player, curr, prev)=>{
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

DPUtils.store().player_camera_reset.register((player, curr, prev)=>{
    if (!(player instanceof Player)) return
    if (curr) {
        player.camera.clear()
    }
})

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damage }) => {
    const absorption = DPUtils.store().effect_damage_absorption.curr(hurtEntity, false)
    if (absorption) {
        EntityOperation.create().healthAbs(damage).run(hurtEntity)
    }
})