import { world } from "@minecraft/server";
import { MenuUtils } from "./utils/ui_utils";
import { BehaviorTemplates, BehaviorUtils, NodeState } from "./utils/behavior_utils";

world.afterEvents.itemStartUse.subscribe(({ source: player, itemStack }) => {
    MenuUtils.title("Debug Menu")

})

// 示例：按实体绑定（perEntity）
// 为新生成的特定怪物（例如 zombie）注册独立行为树
world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    if (!entity || entity.typeId !== "minecraft:zombie") return;

    const tree = BehaviorTemplates.follow(
        // 跟随最近玩家
        (e) => e.dimension.getPlayers({ closest: 1, location: e.location })[0] ?? null,
        // 演示移动行为（在真实逻辑里替换为你的移动到目标实现）
        (e, target) => NodeState.SUCCESS,
        6
    );

    BehaviorUtils.register(entity, tree);
});