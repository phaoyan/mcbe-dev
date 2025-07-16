import { Entity, system } from "@minecraft/server";
import { DPUtils } from "../utils/dp_utils";

// 事件驱动释放技能，key为事件名，value为技能函数，返回这个技能的冷却时间
const skills: { [key: string]: (mob: Entity, skill: string) => number } = {

}

system.afterEvents.scriptEventReceive.subscribe(({id, sourceEntity: mob})=>{
    if (!mob) return
    if (!Object.keys(skills).includes(id)) return
    if (DPUtils.store().mob_skill_cooldown.curr(mob) > system.currentTick) return
    const cooldown = skills[id](mob, id)
    DPUtils.store().mob_skill_cooldown.set(mob, system.currentTick + cooldown)
})