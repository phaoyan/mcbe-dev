import { Entity, Player } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EntityEventIds } from "../lists/event_list";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { EntityState } from "./entity_utils";
import { TagList } from "../lists/tag_list";

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