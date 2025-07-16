// 将物品绑定到玩家DP值

import { EquipmentSlot, ItemStack, Player } from "@minecraft/server";
import { DPUtils } from "../utils/dp_utils";
import { InventoryUtils } from "../utils/inventory_utils";
import { MinecraftItemTypes } from "@minecraft/vanilla-data";

export interface ItemBind {
    inventory?: string[]
    head?: string
    chest?: string
    legs?: string
    feet?: string
    mainhand?: string
    offhand?: string
}

export const itembinds: { [key: string]: ItemBind } = {

}


DPUtils.store().itembind.register((target, curr, prev) => {
    if (!(target instanceof Player)) return
    if(!!prev && Object.keys(itembinds).includes(prev)) {
        const prevItembind = itembinds[prev]
        prevItembind.inventory?.forEach(item=>InventoryUtils.clear(target, item))
        prevItembind.head && InventoryUtils.clear(target, prevItembind.head)
        prevItembind.chest && InventoryUtils.clear(target, prevItembind.chest)
        prevItembind.legs && InventoryUtils.clear(target, prevItembind.legs)
        prevItembind.feet && InventoryUtils.clear(target, prevItembind.feet)
        prevItembind.mainhand && InventoryUtils.clear(target, prevItembind.mainhand)
        prevItembind.offhand && InventoryUtils.clear(target, prevItembind.offhand)
    }
    if(Object.keys(itembinds).includes(curr)) {
        const currItembind = itembinds[curr]
        currItembind.inventory?.forEach(item=>InventoryUtils.give(target, new ItemStack(item), {onlyOnce: true, unremovable: true}))
        currItembind.head && InventoryUtils.equip(target, currItembind.head, EquipmentSlot.Head, {onlyOnce: true, override: false})
        currItembind.chest && InventoryUtils.equip(target, currItembind.chest, EquipmentSlot.Chest, {onlyOnce: true, override: false})
        currItembind.legs && InventoryUtils.equip(target, currItembind.legs, EquipmentSlot.Legs, {onlyOnce: true, override: false})
        currItembind.feet && InventoryUtils.equip(target, currItembind.feet, EquipmentSlot.Feet, {onlyOnce: true, override: false})
        currItembind.mainhand && InventoryUtils.equip(target, currItembind.mainhand, EquipmentSlot.Mainhand, {onlyOnce: true, override: false})
        currItembind.offhand && InventoryUtils.equip(target, currItembind.offhand, EquipmentSlot.Offhand, {onlyOnce: true, override: false})
    }
})