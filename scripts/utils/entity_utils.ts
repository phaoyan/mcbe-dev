import { Vector3Utils } from "@minecraft/math";
import { Entity, EntityComponentTypes, EntityEffectOptions, EntityQueryOptions, Vector3 } from "@minecraft/server";
import { VecUtils } from "./vec_utils";

export const EntityUtilsOptions: { [key: string]: EntityQueryOptions } = {
    Normal: {
        maxDistance: 128,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
        excludeFamilies: ["projectile", "dummy"],
    },
    Dummy: {
        maxDistance: 128,
        families: ["dummy"],
    },
    All: {
        maxDistance: 128,
    }
}

export class EntityUtils {
    static ENTITIES: Entity[]
    static entities(
        entity: Entity, 
        options: EntityQueryOptions = EntityUtilsOptions.Normal, 
        self: boolean = false
    ) {
        this.ENTITIES = entity.dimension.getEntities(options).filter(e => self ? true : e.id !== entity.id)
        return EntityUtils
    }

    static foreach(callback: (e: Entity) => void) {
        this.ENTITIES.forEach(callback)
        return EntityUtils
    }

    static enumerate(entities: Entity | Entity[]) {
        if (entities instanceof Entity)
            this.ENTITIES = [entities]
        else
            this.ENTITIES = entities
        return EntityUtils
    }

    static filter(filter: (e: Entity) => boolean) {
        this.ENTITIES = this.ENTITIES.filter(filter)
        return EntityUtils
    }

    static selectById(id: string) {
        this.ENTITIES = this.ENTITIES.filter(e => e.id === id)
        return EntityUtils
    }

    
    static selectByTypeId(typeId: string) {
        this.ENTITIES = this.ENTITIES.filter(e => e.typeId === typeId)
        return EntityUtils
    }

    static selectByFamily(family: string) {
        this.ENTITIES = this.ENTITIES.filter(e => e.getComponent(EntityComponentTypes.TypeFamily)?.hasTypeFamily(family))
        return EntityUtils
    }

    static get() {
        return this.ENTITIES
    }

    static getFirst(){
        if (this.ENTITIES.length === 0) return undefined
        return this.ENTITIES[0]
    }

    static damage(amount: number) {
        this.ENTITIES.forEach(target => target.applyDamage(amount))
        return EntityUtils
    }

    static effect(effect: string, ticks: number, options?: EntityEffectOptions) {
        this.ENTITIES.forEach(target => target.addEffect(effect, ticks, options))
        return EntityUtils
    }

    static knockbackBaseView(entity: Entity, hori: number, vert: number) {
        if (!entity) return EntityUtils
        this.ENTITIES.forEach(target => {
            const unit = VecUtils.unit(VecUtils.hori(entity.getViewDirection()), hori)
            target.applyKnockback({x: unit.x, z: unit.z}, vert)
        })
        return EntityUtils
    }

    static knockbackBaseDiff(location: Entity | Vector3, direction: "intro" | "outro", hori: number, vert: number) {
        if (location instanceof Entity)
            location = location.location
        this.ENTITIES.forEach(target => {
            const locDiff =
                direction === "outro" ?
                    Vector3Utils.subtract(target.location, location) :
                    Vector3Utils.subtract(location, target.location)
            const unit = VecUtils.unit(VecUtils.hori(locDiff), hori)
            target.applyKnockback({x: unit.x, z: unit.z}, vert)
        })
        return EntityUtils
    }


}
