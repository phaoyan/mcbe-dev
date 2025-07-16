import { Block, BlockComponentTypes, BlockInventoryComponent, Container, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, ItemStack, Player } from "@minecraft/server";

export interface GiveOptions {
    onlyOnce?: boolean
    unremovable?: boolean
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
        for (let i = 0; i < (inventory?.size ?? 0); i ++) {
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
        if (options.onlyOnce && this.items(target).filter(i => i?.typeId === item.typeId).length > 0) {
            return
        }
        if (options.unremovable) {
            target.runCommand(`give @s ${item.typeId} ${item.amount} 0 {"minecraft:item_lock":{ "mode": "lock_in_inventory" },"minecraft:keep_on_death":{}}`)
        }else {
            target.runCommand(`give @s ${item.typeId} ${item.amount}`)
        }
    }

    static clear(target: Entity, typeId: string) {
        target.runCommand(`clear @s ${typeId}`)
    }
}