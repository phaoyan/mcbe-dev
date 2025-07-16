import { Entity, EntityComponentTypes, EntityEquippableComponent, EntityHealthComponent, EntityIsShearedComponent, EntityNavigationGenericComponent, EntityNavigationWalkComponent, EntityTypeFamilyComponent, EntityVariantComponent } from "@minecraft/server";

export class CompUtils {
    static hp(target: Entity) {
        return (target.getComponent(EntityComponentTypes.Health) as EntityHealthComponent)
    }

    static typeFamily(target: Entity) {
        return (target.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent)
    }

    static variant(target: Entity) {
        return (target.getComponent(EntityComponentTypes.Variant) as EntityVariantComponent)
    }

    static equippable(target: Entity) {
        return (target.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)
    }

    static isSheared(target: Entity) {
        return (target.getComponent(EntityComponentTypes.IsSheared) as EntityIsShearedComponent)
    }

}