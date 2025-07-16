import { Player, world } from "@minecraft/server";

const rclickMapping: { [key: string]: (player: Player) => void } = {

}

world.afterEvents.itemStartUse.subscribe(({ source: player, itemStack }) => {
    if (!itemStack.typeId.startsWith("nsbc:magic_")) return
    const skillFunction = rclickMapping[itemStack.typeId];
    if (skillFunction) {
        skillFunction(player);
    } else {
        player.sendMessage(`RClick Error: ${itemStack.typeId}`);
    }
})