import { ItemLockMode, ItemStack } from "@minecraft/server"
import { DPUtils } from "./dp_utils"

export class ItemUtils {

    private configs: {
        id: string,
        amount: number,
        lore: string[],
        name: string,
        lockMode: ItemLockMode,
        keepOnDeath: boolean,
        dp: { [key: string]: any }
    }

    private constructor(configs: {
        id: string,
        amount: number,
        lore: string[],
        name: string,
        lockMode: ItemLockMode,
        keepOnDeath: boolean,
        dp: { [key: string]: any }
    }) {
        this.configs = configs
    }

    static fromId(itemId: string, amount: number = 1) {
        return new ItemUtils({
            id: itemId,
            amount: amount,
            dp: {},
            lore: [],
            name: "",
            lockMode: ItemLockMode.none,
            keepOnDeath: false
        })
    }

    static fromItem(item: ItemStack) {
        return new ItemUtils({
            id: item.typeId,
            amount: item.amount,
            dp: {},
            lore: item.getLore(),
            name: item.nameTag ?? "",
            lockMode: item.lockMode,
            keepOnDeath: item.keepOnDeath
        })
    }

    keep() {
        this.configs.keepOnDeath = true
        return this
    }

    lockInv() {
        this.configs.lockMode = ItemLockMode.inventory
        return this
    }

    lockSlot() {
        this.configs.lockMode = ItemLockMode.slot
        return this
    }

    lock(slot: boolean = false) {
        this.configs.lockMode = slot ? ItemLockMode.slot : ItemLockMode.inventory
        this.configs.keepOnDeath = true
        return this
    }

    withDP(k: string, v: any) {
        this.configs.dp[k] = v
        return this
    }

    withLore(lore: string[]) {
        this.configs.lore = lore
        return this
    }

    withName(name: string) {
        this.configs.name = name
        return this
    }

    get() {
        const config = { ...this.configs }
        const item = new ItemStack(config.id, config.amount)
        item.setLore(config.lore)
        item.nameTag = config.name
        item.lockMode = config.lockMode
        item.keepOnDeath = config.keepOnDeath
        Object.keys(config.dp).forEach(k => DPUtils.set(item, k, config.dp[k]))
        return item
    }
}