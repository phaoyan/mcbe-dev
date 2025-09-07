import { system, world } from "@minecraft/server";
import { MinecraftEntityTypes } from "@minecraft/vanilla-data";
import { VecUtils } from "./utils/math_utils";

world.afterEvents.worldLoad.subscribe(() => {
    console.warn("当前版本时间戳：XXX")
})

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (id !== "debug:summon") return
    if (!sourceEntity) return
    for (let i = 0; i < 30; i++) {
        const location = VecUtils.start(sourceEntity).moveF(Math.random() * 30 - 15).moveR(Math.random() * 30 - 15).end()
        sourceEntity.dimension.spawnEntity(MinecraftEntityTypes.IronGolem, location)
    }
})