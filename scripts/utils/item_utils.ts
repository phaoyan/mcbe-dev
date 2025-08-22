import { ItemLockMode, ItemStack } from "@minecraft/server"
import { DPUtils } from "./dp_utils"

export class ItemUtils {

    static CONFIGS: {
        id: string,
        amount: number,
        lore: string[],
        name: string,
        lockMode: ItemLockMode,
        keepOnDeath: boolean,
        dp: {
            [key: string]: any
        },
    }

    static fromId(itemId: string, amount: number = 1) {
        this.CONFIGS = {
            id: itemId,
            amount: amount,
            dp: {},
            lore: [],
            name: "",
            lockMode: ItemLockMode.none,
            keepOnDeath: false
        }
        return ItemUtils
    }

    static fromItem(item: ItemStack) {
        this.CONFIGS = {
            id: item.typeId,
            amount: item.amount,
            dp: {},
            lore: item.getLore(),
            name: item.nameTag ?? "",
            lockMode: item.lockMode,
            keepOnDeath: item.keepOnDeath
        }
        return ItemUtils
    }

    static unremovable() {
        this.CONFIGS.lockMode = ItemLockMode.inventory
        this.CONFIGS.keepOnDeath = true
        return ItemUtils
    }

    static withDP(k: string, v: any, placeHolder?: any) {
        this.CONFIGS.dp[k] = v
        return ItemUtils
    }

    static withLore(lore: string[]) {
        this.CONFIGS.lore = lore
        return ItemUtils
    }

    static withName(name: string) {
        this.CONFIGS.name = name
        return ItemUtils
    }

    static get() {
        const config = {...this.CONFIGS}
        const item = new ItemStack(config.id, config.amount)
        item.setLore(config.lore)
        item.nameTag = config.name
        item.lockMode = config.lockMode
        item.keepOnDeath = config.keepOnDeath
        Object.keys(config.dp).forEach(k=>DPUtils.set(item, k, config.dp[k]))
        return item
    }

    static delay(){
        const config = {...this.CONFIGS}
        return ()=>{
            const item = new ItemStack(config.id, config.amount)
            item.setLore(config.lore)
            item.nameTag = config.name
            item.lockMode = config.lockMode
            item.keepOnDeath = config.keepOnDeath
            Object.keys(config.dp).forEach(k=>DPUtils.set(item, k, config.dp[k]))
            return item
        }
    }

}