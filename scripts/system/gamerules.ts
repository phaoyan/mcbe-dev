import { world } from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";

world.afterEvents.worldLoad.subscribe(() => {
    world.getDimension(MinecraftDimensionTypes.Overworld).runCommand("gamerule showtags false")
})