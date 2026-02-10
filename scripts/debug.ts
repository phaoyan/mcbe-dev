import { BlockComponentTypes, BlockInventoryComponent, ItemStack, Player, system, world } from "@minecraft/server";
import { MinecraftBlockTypes, MinecraftEntityTypes, MinecraftItemTypes } from "@minecraft/vanilla-data";
import { VecUtils } from "./utils/math_utils";
import ref, { animationTree as animation_ids, animationLength as animation_length } from "./refs/ref";
import { TimeUtils } from "./utils/time_utils";

world.afterEvents.worldLoad.subscribe(() => {
    console.warn("Current Tick: " + world.getAbsoluteTime())
})

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (id !== "debug:summon") return
    if (!sourceEntity) return
    for (let i = 0; i < 30; i++) {
        const location = VecUtils.start(sourceEntity).moveF(Math.random() * 30 - 15).moveR(Math.random() * 30 - 15).end()
        sourceEntity.dimension.spawnEntity(MinecraftEntityTypes.Pillager, location)
    }
})

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (id !== "debug:animation") return
    if (!sourceEntity) return
    const typeId = message as string
    // @ts-ignore
    const currAnimations = Object.values(animation_ids[NAME_SPACE][typeId.replace(`${NAME_SPACE}:`, "")])
    if (!currAnimations) return

    const entity = sourceEntity.dimension.spawnEntity(typeId, VecUtils.start(sourceEntity).moveF(10).end())
    const lens = currAnimations.map(animation => Math.ceil(animation_length[animation as keyof typeof animation_length] * 20));
    const sumLen = lens.map((_, index) => lens.slice(0, index).reduce((a, b) => a + b + 20, 5))
    TimeUtils.timeout(() => {
        TimeUtils.timeseries((_, index) => {
            // @ts-ignore
            entity.playAnimation(currAnimations[index])
            console.warn(currAnimations[index])
        }, sumLen)
        TimeUtils.timeout(() => {
            entity.remove()
        }, sumLen[sumLen.length - 1] + 20)
    }, 20)
})

let current = 0
system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (id !== "debug:animations") return
    if (!sourceEntity) return

    // @ts-ignore
    const typeId = `${NAME_SPACE}:${Object.keys(animation_ids[NAME_SPACE])[current % Object.keys(animation_ids[NAME_SPACE]).length]}`
    // @ts-ignore
    const currAnimations = Object.values(animation_ids[NAME_SPACE][typeId.replace(`${NAME_SPACE}:`, "")])
    if (!currAnimations) return

    const entity = sourceEntity.dimension.spawnEntity(typeId, VecUtils.start(sourceEntity).moveF(20).moveYToBlock(20).end())
    const lens = currAnimations.map(animation => Math.ceil(animation_length[animation as keyof typeof animation_length] * 20));
    const sumLen = lens.map((_, index) => lens.slice(0, index).reduce((a, b) => a + b + 20, 5))
    TimeUtils.timeout(() => {
        TimeUtils.timeseries((_, index) => {
            // @ts-ignore
            entity.playAnimation(currAnimations[index])
            console.warn(currAnimations[index])
        }, sumLen)
        TimeUtils.timeout(() => {
            entity.remove()
            current++
            sourceEntity.runCommand("scriptevent debug:animations")
        }, sumLen[sumLen.length - 1] + lens[lens.length - 1] + 20)
    }, 20)
})

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (id !== "debug:animations-next") return
    if (!sourceEntity) return
    sourceEntity.runCommand("kill @e")
    current += parseInt(message as string)
    sourceEntity.runCommand("scriptevent debug:animations")
})

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (id !== "debug:move") return
    if (!sourceEntity) return
    const dist = parseInt(message as string)
    const loc = VecUtils.start(sourceEntity).moveF(dist).end()
    sourceEntity.teleport(loc)
})
