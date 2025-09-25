import { ItemLockMode, ItemStack } from "@minecraft/server"
import { DPUtils } from "./dp_utils"

export interface ItemConfig {
    id: string,
    amount: number,
    lore: string[],
    name: string,
    lockMode: ItemLockMode,
    keepOnDeath: boolean,
    dp: { [key: string]: any }
}

export class ItemUtils {

    private config: ItemConfig

    private constructor(configs: ItemConfig) {
        this.config = configs
    }

    static fromConfig(config: ItemConfig) {
        return new ItemUtils(config)
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
        this.config.keepOnDeath = true
        return this
    }

    lockInv() {
        this.config.lockMode = ItemLockMode.inventory
        return this
    }

    lockSlot() {
        this.config.lockMode = ItemLockMode.slot
        return this
    }

    lock(slot: boolean = false) {
        this.config.lockMode = slot ? ItemLockMode.slot : ItemLockMode.inventory
        this.config.keepOnDeath = true
        return this
    }

    withDP(k: string, v: any) {
        this.config.dp[k] = v
        return this
    }

    withLore(lore: string[]) {
        this.config.lore = lore
        return this
    }

    withName(name: string) {
        this.config.name = name
        return this
    }

    get() {
        const config = { ...this.config }
        const item = new ItemStack(config.id, config.amount)
        item.setLore(config.lore)
        item.nameTag = config.name
        item.lockMode = config.lockMode
        item.keepOnDeath = config.keepOnDeath
        Object.keys(config.dp).forEach(k => DPUtils.set(item, k, config.dp[k]))
        return item
    }

    conf(){
        return this.config
    }
}