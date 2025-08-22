import { Block, BlockComponentTypes, BlockInventoryComponent, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, ItemStack, Player, world, World } from "@minecraft/server";
import { DPUtils } from "./dp_utils";


export interface GiveOptions {
    onlyOnce?: boolean
    unremovable?: boolean
}

export interface EquipOptions {
    onlyOnce?: boolean
    override?: boolean
}

export interface ItemBind {
    inventory?: ((player: Player)=>ItemStack)[]
    head?: (player: Player)=>ItemStack
    chest?: (player: Player)=>ItemStack
    legs?: (player: Player)=>ItemStack
    feet?: (player: Player)=>ItemStack
    mainhand?: (player: Player)=>ItemStack
    offhand?: (player: Player)=>ItemStack
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

    static itembinds(data: {dpId: string, itembinds: { [key: string]: ItemBind }}) {
        const itembinds = data.itembinds
        world.afterEvents.worldLoad.subscribe(()=>{
            DPUtils.register(data.dpId, (target: Entity | ItemStack | World, curr: string, prev: string) => {
                if (!(target instanceof Player)) return
                if (curr === prev) return
                if (!!prev && Object.keys(itembinds).includes(prev)) {
                    const prevItembind = itembinds[prev]
                    prevItembind.inventory?.forEach(item => InventoryUtils.clear(target, item(target).typeId))
                    prevItembind.head?.(target) && InventoryUtils.clear(target, prevItembind.head?.(target).typeId)
                    prevItembind.chest?.(target) && InventoryUtils.clear(target, prevItembind.chest?.(target).typeId)
                    prevItembind.legs?.(target) && InventoryUtils.clear(target, prevItembind.legs?.(target).typeId)
                    prevItembind.feet?.(target) && InventoryUtils.clear(target, prevItembind.feet?.(target).typeId)
                    prevItembind.mainhand?.(target) && InventoryUtils.clear(target, prevItembind.mainhand?.(target).typeId)
                    prevItembind.offhand?.(target) && InventoryUtils.clear(target, prevItembind.offhand?.(target).typeId)
                }
                if (Object.keys(itembinds).includes(curr)) {
                    const currItembind = itembinds[curr]
                    currItembind.inventory?.forEach(item => InventoryUtils.entity(target)?.addItem(item(target)))
                    currItembind.head?.(target) && InventoryUtils.equip(target, currItembind.head?.(target), EquipmentSlot.Head, { onlyOnce: true, override: false })
                    currItembind.chest?.(target) && InventoryUtils.equip(target, currItembind.chest?.(target), EquipmentSlot.Chest, { onlyOnce: true, override: false })
                    currItembind.legs?.(target) && InventoryUtils.equip(target, currItembind.legs?.(target), EquipmentSlot.Legs, { onlyOnce: true, override: false })
                    currItembind.feet?.(target) && InventoryUtils.equip(target, currItembind.feet?.(target), EquipmentSlot.Feet, { onlyOnce: true, override: false })
                    currItembind.mainhand?.(target) && InventoryUtils.equip(target, currItembind.mainhand?.(target), EquipmentSlot.Mainhand, { onlyOnce: true, override: false })
                    currItembind.offhand?.(target) && InventoryUtils.equip(target, currItembind.offhand?.(target), EquipmentSlot.Offhand, { onlyOnce: true, override: false })
                }
            })
        })
    }
}

