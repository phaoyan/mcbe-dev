import { Entity, Player } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EntityEventIds } from "../lists/event_list";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";

DPUtils.store().effect_superarmor.register((target, curr, prev)=>{
    if (!(target instanceof Entity)) return
    if (curr) {
        console.warn("SuperArmorOn")
        target.triggerEvent(EntityEventIds.SuperArmorOn)
    } else {
        console.warn("SuperArmorOff")
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
