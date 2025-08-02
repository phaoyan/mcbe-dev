import { ItemLockMode, ItemStack } from "@minecraft/server"
import { DPUtils } from "./dp_utils"
import { DamageAttribute, DamageUtils } from "./damage_utils"

export class ItemUtils {

    static ITEM: ItemStack

    static fromId(itemId: string, amount: number = 1) {
        this.ITEM = new ItemStack(itemId, amount)
        return ItemUtils
    }

    static fromItem(item: ItemStack) {
        this.ITEM = item
        return ItemUtils
    }

    static unremovable() {
        this.ITEM.lockMode = ItemLockMode.inventory
        this.ITEM.keepOnDeath = true
        return ItemUtils
    }

    static withDP(k: string, v: any, placeHolder?: any) {
        DPUtils.set(this.ITEM, k, v, placeHolder)
        return ItemUtils
    }

    static withLore(lore: string[]) {
        this.ITEM.setLore(lore)
        return ItemUtils
    }

    static withName(name: string) {
        this.ITEM.nameTag = name
        return ItemUtils
    }

    static withAttribute(attribute: Partial<DamageAttribute>) {
        DamageUtils.setItemAttribute(this.ITEM, attribute)
        return ItemUtils
    }   

    static set(callback: (item: ItemStack) => void) {
        callback(this.ITEM)
        return ItemUtils
    }

    static get() {
        return this.ITEM
    }
}