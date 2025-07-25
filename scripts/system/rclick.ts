import { Player, world } from "@minecraft/server";

const rclickMapping: { [key: string]: (player: Player) => void } = {

}

world.afterEvents.itemStartUse.subscribe(({ source: player, itemStack }) => {
    if (Object.keys(rclickMapping).includes(itemStack.typeId)) {
        rclickMapping[itemStack.typeId](player);
    }
})