import { BlockComponentTickEvent, system, world } from "@minecraft/server";
import blockIds from "../json/block_tree.json";
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";
import { NAME_SPACE } from "../data";
import { DPUtils } from "./dp_utils";

export class BlockUtils {
    static onTickCallbacks: { [key: string]: (event: BlockComponentTickEvent) => void } = {}

    static onTick(typeId: string, callback: (event: BlockComponentTickEvent) => void) {
        this.onTickCallbacks[typeId] = (event: BlockComponentTickEvent)=>{
            if (DPUtils.store().world_disable_block_ticking.curr(world, false)) return
            callback(event)
        }
    }
    
}

system.beforeEvents.startup.subscribe(({blockComponentRegistry})=>{
    Object.entries(BlockUtils.onTickCallbacks).forEach(([typeId, callback])=>{
        blockComponentRegistry.registerCustomComponent(typeId, {
            onTick: callback
        })
    })
})

Object.values(blockIds.dummy.spawner)
.filter((typeId)=>typeId.startsWith(`${NAME_SPACE}:spawner_`))
.forEach((typeId)=>{
    const entityId = typeId.replace(`${NAME_SPACE}:spawner_`, "").replace("__", ":")
    BlockUtils.onTick(typeId, (event)=>{
        event.dimension.runCommand(`summon ${entityId} ${event.block.location.x} ${event.block.location.y} ${event.block.location.z}`)
        event.block.setType(MinecraftBlockTypes.Air)
    })
})

BlockUtils.onTick(blockIds.dummy.placeholder.placeholder, (event)=>{
    event.block.setType(MinecraftBlockTypes.Air)
})