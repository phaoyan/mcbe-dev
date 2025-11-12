import { Block, BlockComponentTypes, BlockInventoryComponent, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, ItemStack, Player, system, world, World } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { ItemConfig, ItemUtils } from "./item_utils";


export interface GiveOptions {
    onlyOnce?: boolean
    slot?: number
}

export interface EquipOptions {
    onlyOnce?: boolean
    override?: boolean
}

export interface ItemBind {
    inventory?: ItemConfig[]
    head?: ItemConfig
    chest?: ItemConfig
    legs?: ItemConfig
    feet?: ItemConfig
    mainhand?: ItemConfig
    offhand?: ItemConfig
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

    static replace(target: Entity, rep: (item?: ItemStack) => ItemStack | undefined, slot: EquipmentSlot) {
        const item = this.equippables(target).getEquipment(slot)
        const newItem = rep(item)
        this.equippables(target).setEquipment(slot, newItem)
    }

    static clear(target: Entity, typeId: string, slot?: number) {
        if (slot === undefined) {
            target.runCommand(`clear @s ${typeId}`)
        } else {
            this.entity(target)?.setItem(slot)
        }
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

    static keymapping(target: Player, dpId: string, itembinds: { [key: string]: ItemBind }) {
        return itembinds[DPUtils.curr(target, dpId)]
    }

    static itembinds(data: { 
        itembindId: string,
        triggers: string | string[], 
        mapping: (target: Player) => ItemBind 
    }) {
        const triggers = Array.isArray(data.triggers) ? data.triggers : [data.triggers]
        world.afterEvents.worldLoad.subscribe(() => {
            triggers.forEach(trigger=>{
                DPUtils.register(trigger, (target: Entity | ItemStack | World, curr, prev) => {
                    if (prev === curr) return
                    if (!(target instanceof Player)) return
                    const prevItembind: ItemBind = DPUtils.store().player_prev_itembind.curr(target, {})[data.itembindId]
                    const currItembind: ItemBind = data.mapping(target)

                    prevItembind?.inventory?.forEach(item => item && InventoryUtils.clear(target, item.id))
                    prevItembind?.head?.id && InventoryUtils.clear(target, prevItembind.head.id)
                    prevItembind?.chest?.id && InventoryUtils.clear(target, prevItembind.chest.id)
                    prevItembind?.legs?.id && InventoryUtils.clear(target, prevItembind.legs.id)
                    prevItembind?.feet?.id && InventoryUtils.clear(target, prevItembind.feet.id)
                    prevItembind?.mainhand?.id && InventoryUtils.clear(target, prevItembind.mainhand.id)
                    prevItembind?.offhand?.id && InventoryUtils.clear(target, prevItembind.offhand.id)

                    currItembind.inventory?.forEach(item => item && InventoryUtils.give(target, ItemUtils.fromConfig(item).get()))
                    currItembind.head?.id && InventoryUtils.equip(target, ItemUtils.fromConfig(currItembind.head).get(), EquipmentSlot.Head, { onlyOnce: true, override: true })
                    currItembind.chest?.id && InventoryUtils.equip(target, ItemUtils.fromConfig(currItembind.chest).get(), EquipmentSlot.Chest, { onlyOnce: true, override: true })
                    currItembind.legs?.id && InventoryUtils.equip(target, ItemUtils.fromConfig(currItembind.legs).get(), EquipmentSlot.Legs, { onlyOnce: true, override: true })
                    currItembind.feet?.id && InventoryUtils.equip(target, ItemUtils.fromConfig(currItembind.feet).get(), EquipmentSlot.Feet, { onlyOnce: true, override: true })
                    currItembind.mainhand?.id && InventoryUtils.equip(target, ItemUtils.fromConfig(currItembind.mainhand).get(), EquipmentSlot.Mainhand, { onlyOnce: true, override: true })
                    currItembind.offhand?.id && InventoryUtils.equip(target, ItemUtils.fromConfig(currItembind.offhand).get(), EquipmentSlot.Offhand, { onlyOnce: true, override: true })

                    DPUtils.store().player_prev_itembind.set(target, (curr: any)=>({...curr, [data.itembindId]: currItembind}), {})
                })
            })
        })
        return InventoryUtils
    }
}

