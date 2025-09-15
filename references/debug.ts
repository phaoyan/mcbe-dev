import { system, world } from "@minecraft/server";
import { EntityOperation } from "./utils/entity_utils";

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity, message }) => {
    if (!sourceEntity) return
    if (id === "debug:knockback") {
        const f = JSON.parse(message.split(",")[0])
        const y = JSON.parse(message.split(",")[1])
        EntityOperation.create().knockbackBaseView(sourceEntity, f, y).run(sourceEntity)
    }
})