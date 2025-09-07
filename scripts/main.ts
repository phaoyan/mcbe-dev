import { Player, world } from "@minecraft/server";
import "./debug";
import "./init";
import "./lists/damage_list";
import "./lists/dp_list";
import "./lists/event_list";
import "./lists/tag_list";
import "./utils/anim_utils";
import "./utils/behavior_utils";
import "./utils/click_utils";
import "./utils/comp_utils";
import "./utils/damage_utils";
import "./utils/dp_utils";
import "./utils/entity_utils";
import "./utils/inventory_utils";
import "./utils/item_utils";
import "./utils/math_utils";
import "./utils/time_utils";
import "./utils/ui_utils";
import "./utils/voidbind_utils";
import itemIds from "./json/item_ids.json";
import { InventoryUtils } from "./utils/inventory_utils";
import { ItemUtils } from "./utils/item_utils";

world.afterEvents.itemStartUse.subscribe(({ source, itemStack }) => {
    if (!(source instanceof Player)) return
    if (itemIds.debug_menu !== itemStack.typeId) return
    InventoryUtils.give(source, ItemUtils.fromId(itemIds.debug_menu).get(), { slot: 0 })

})