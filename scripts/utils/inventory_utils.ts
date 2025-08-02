import { Block, BlockComponentTypes, BlockInventoryComponent, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, ItemLockMode, ItemStack, Player, World } from "@minecraft/server";

export interface GiveOptions {
    onlyOnce?: boolean
    unremovable?: boolean
}

export interface EquipOptions {
    onlyOnce?: boolean
    override?: boolean
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

    static give(target: Entity, item: ItemStack, options: GiveOptions) {
        if (options.onlyOnce && this.items(target).filter(i => i?.typeId === item.typeId).length > 0) return
        this.entity(target)?.addItem(item)
    }

    static equip(target: Entity, item: ItemStack, slot: EquipmentSlot, options: EquipOptions) {
        if (options.onlyOnce && this.items(target).filter(i => i?.typeId === item.typeId).length > 0) return
        if (!options.override && this.equippables(target).getEquipment(slot)) return
        this.equippables(target).setEquipment(slot, item)
    }

    static clear(target: Entity, typeId: string) {
        target.runCommand(`clear @s ${typeId}`)
    }
}

export interface ItemBind {
    inventory?: ItemStack[]
    head?: ItemStack
    chest?: ItemStack
    legs?: ItemStack
    feet?: ItemStack
    mainhand?: ItemStack
    offhand?: ItemStack
}

export const registerItembinds = (itembinds: { [key: string]: ItemBind }) => {
    return (target: Entity | ItemStack | World, curr: string, prev: string) => {
        if (!(target instanceof Player)) return
        if (curr === prev) return
        if (!!prev && Object.keys(itembinds).includes(prev)) {
            const prevItembind = itembinds[prev]
            prevItembind.inventory?.forEach(item => InventoryUtils.clear(target, item.typeId))
            prevItembind.head && InventoryUtils.clear(target, prevItembind.head.typeId)
            prevItembind.chest && InventoryUtils.clear(target, prevItembind.chest.typeId)
            prevItembind.legs && InventoryUtils.clear(target, prevItembind.legs.typeId)
            prevItembind.feet && InventoryUtils.clear(target, prevItembind.feet.typeId)
            prevItembind.mainhand && InventoryUtils.clear(target, prevItembind.mainhand.typeId)
            prevItembind.offhand && InventoryUtils.clear(target, prevItembind.offhand.typeId)
        }
        if (Object.keys(itembinds).includes(curr)) {
            const currItembind = itembinds[curr]
            currItembind.inventory?.forEach(item => InventoryUtils.entity(target)?.addItem(item))
            currItembind.head && InventoryUtils.equip(target, currItembind.head, EquipmentSlot.Head, { onlyOnce: true, override: false })
            currItembind.chest && InventoryUtils.equip(target, currItembind.chest, EquipmentSlot.Chest, { onlyOnce: true, override: false })
            currItembind.legs && InventoryUtils.equip(target, currItembind.legs, EquipmentSlot.Legs, { onlyOnce: true, override: false })
            currItembind.feet && InventoryUtils.equip(target, currItembind.feet, EquipmentSlot.Feet, { onlyOnce: true, override: false })
            currItembind.mainhand && InventoryUtils.equip(target, currItembind.mainhand, EquipmentSlot.Mainhand, { onlyOnce: true, override: false })
            currItembind.offhand && InventoryUtils.equip(target, currItembind.offhand, EquipmentSlot.Offhand, { onlyOnce: true, override: false })
        }
    }
}