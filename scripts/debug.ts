import { world } from "@minecraft/server";
import { MenuUtils } from "./utils/ui_utils";

world.afterEvents.itemStartUse.subscribe(({ source: player, itemStack }) => {
    MenuUtils.title("Debug Menu")

})