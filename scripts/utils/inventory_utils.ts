import { Block, BlockComponentTypes, BlockInventoryComponent, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, ItemStack, Player, system, world, World } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { ItemUtils } from "./item_utils";


export interface GiveOptions {
    onlyOnce?: boolean
    slot?: number
}

export interface EquipOptions {
    onlyOnce?: boolean
    override?: boolean
}

export interface ItemBind {
    inventory?: (ItemUtils | { item: ItemUtils, slot: number })[]
    head?: ItemUtils
    chest?: ItemUtils
    legs?: ItemUtils
    feet?: ItemUtils
    mainhand?: ItemUtils
    offhand?: ItemUtils
}

export class InventoryUtils {
    static entity(target: Entity) {
        return (target.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container
    }

    static block(target: Block) {
        return (target.getComponent(BlockComponentTypes.Inventory) as BlockInventoryComponent).container
    }

    static equippables(target: Entity) {
        return (target.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)
    }

    static items(target: Entity) {
        const items = []
        const inventory = this.entity(target)
        for (let i = 0; i < (inventory?.size ?? 0); i++) {
            items.push(inventory?.getItem(i))
        }
        items.push(this.equippables(target).getEquipment(EquipmentSlot.Chest))
        items.push(this.equippables(target).getEquipment(EquipmentSlot.Feet))
        items.push(this.equippables(target).getEquipment(EquipmentSlot.Head))
        items.push(this.equippables(target).getEquipment(EquipmentSlot.Legs))
        items.push(this.equippables(target).getEquipment(EquipmentSlot.Mainhand))
        items.push(this.equippables(target).getEquipment(EquipmentSlot.Offhand))
        return items
    }

    static give(target: Entity, item: ItemStack, options?: GiveOptions) {
        if (options?.onlyOnce && this.items(target).filter(i => i?.typeId === item.typeId).length > 0) return
        if (options?.slot !== undefined) {
            this.move(target, [options.slot])
            this.entity(target)?.setItem(options.slot, item)
        } else {
            this.entity(target)?.addItem(item)
        }
    }

    static equip(target: Entity, item: ItemStack, slot: EquipmentSlot, options: EquipOptions) {
        if (options.onlyOnce && this.items(target).filter(i => i?.typeId === item.typeId).length > 0) return
        if (!options.override && this.equippables(target).getEquipment(slot)) return
        this.equippables(target).setEquipment(slot, item)
    }

    static clear(target: Entity, typeId: string) {
        target.runCommand(`clear @s ${typeId}`)
    }

    // 将指定槽位的物品放到其他空的栏目里
    static move(target: Entity, slots: number[]) {
        const inventory = this.entity(target)
        if (!inventory) return

        const blocked = new Set(slots)

        const emptySlots: number[] = []
        for (let i = 0; i < (inventory.size ?? 0); i++) {
            if (!inventory.getItem(i) && !blocked.has(i)) {
                emptySlots.push(i)
            }
        }

        const requiredMoves = slots.reduce((count, s) => count + (inventory.getItem(s) ? 1 : 0), 0)
        if (emptySlots.length < requiredMoves) {
            return false
        }

        for (const src of slots) {
            if (emptySlots.length === 0) break
            const item = inventory.getItem(src)
            if (!item) continue
            const dest = emptySlots.shift()
            if (dest === undefined) break
            inventory.swapItems(src, dest, inventory)
        }
        return true
    }

    static itembinds(data: { dpId: string, itembinds: { [key: string]: ItemBind }, keyMapping?: (key: any, target?: Entity)=>string }) {
        const itembinds = data.itembinds
        world.afterEvents.worldLoad.subscribe(() => {
            DPUtils.register(data.dpId, (target: Entity | ItemStack | World, curr: string, prev: string) => {
                if (!(target instanceof Player)) return
                if (curr === prev) return
                if (data.keyMapping) {
                    curr = data.keyMapping(curr, target)
                    prev = data.keyMapping(prev, target)
                }
                if (!!prev && Object.keys(itembinds).includes(prev)) {
                    const prevItembind = itembinds[prev]
                    prevItembind.inventory?.forEach(item => {
                        if (item instanceof ItemUtils) {
                            InventoryUtils.clear(target, item.get().typeId)
                        } else {
                            InventoryUtils.clear(target, item.item.get().typeId)
                        }
                    })
                    prevItembind.head?.get() && InventoryUtils.clear(target, prevItembind.head?.get().typeId)
                    prevItembind.chest?.get() && InventoryUtils.clear(target, prevItembind.chest?.get().typeId)
                    prevItembind.legs?.get() && InventoryUtils.clear(target, prevItembind.legs?.get().typeId)
                    prevItembind.feet?.get() && InventoryUtils.clear(target, prevItembind.feet?.get().typeId)
                    prevItembind.mainhand?.get() && InventoryUtils.clear(target, prevItembind.mainhand?.get().typeId)
                    prevItembind.offhand?.get() && InventoryUtils.clear(target, prevItembind.offhand?.get().typeId)
                }
                if (Object.keys(itembinds).includes(curr)) {
                    const currItembind = itembinds[curr]
                    currItembind.inventory?.forEach(item => {
                        if (item instanceof ItemUtils) {
                            InventoryUtils.give(target, item.get())
                        } else {
                            InventoryUtils.give(target, item.item.get(), { slot: item.slot })
                        }
                    })
                    currItembind.head?.get() && InventoryUtils.equip(target, currItembind.head?.get(), EquipmentSlot.Head, { onlyOnce: true, override: true })
                    currItembind.chest?.get() && InventoryUtils.equip(target, currItembind.chest?.get(), EquipmentSlot.Chest, { onlyOnce: true, override: true })
                    currItembind.legs?.get() && InventoryUtils.equip(target, currItembind.legs?.get(), EquipmentSlot.Legs, { onlyOnce: true, override: true })
                    currItembind.feet?.get() && InventoryUtils.equip(target, currItembind.feet?.get(), EquipmentSlot.Feet, { onlyOnce: true, override: true })
                    currItembind.mainhand?.get() && InventoryUtils.equip(target, currItembind.mainhand?.get(), EquipmentSlot.Mainhand, { onlyOnce: true, override: true })
                    currItembind.offhand?.get() && InventoryUtils.equip(target, currItembind.offhand?.get(), EquipmentSlot.Offhand, { onlyOnce: true, override: true })
                }
            })
        })
        return InventoryUtils
    }
}

