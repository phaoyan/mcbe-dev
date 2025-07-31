import { Vector3Utils } from "@minecraft/math";
import { Entity, EntityDamageCause, EntityEffectOptions, EntityQueryOptions, Vector3, world } from "@minecraft/server";
import { VecUtils } from "./vec_utils";
import { DPUtils } from "./dp_utils";

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
    Both: {
        maxDistance: 128,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
        excludeFamilies: ["projectile"],
    }
}

export class EntityUtils {
    static ENTITIES: Entity[]
    static entities(
        entity: Entity, 
        options: EntityQueryOptions = EntityUtilsOptions.Normal, 
        self: boolean = false
    ) {
        this.ENTITIES = entity.dimension.getEntities({...options, location: entity.location}).filter(e => self ? true : e.id !== entity.id)
        return EntityUtils
    }

    static entitiesByType(entity: Entity, type: string, distance: number = 128) {
        this.ENTITIES = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: distance,
            type: type,
        })
        return EntityUtils
    }

    static entityById(id: string) {
        this.ENTITIES = world.getEntity(id) ? [world.getEntity(id) as Entity] : []
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


    static get() {
        return this.ENTITIES
    }

    static getFirst(){
        if (this.ENTITIES.length === 0) return undefined
        return this.ENTITIES[0]
    }

    static foreach(callback: (e: Entity) => void) {
        this.ENTITIES.forEach(callback)
        return EntityUtils
    }

    static damage(amount: number, source?: Entity, tags: string[] = []) {
        if (!source) {
            this.ENTITIES.forEach(target => !!target && target.applyDamage(amount, { cause: EntityDamageCause.entityAttack, damagingEntity: source }))
            return EntityUtils
        } else {
            const attackerMultiplier = DPUtils.store().attacker_damage_multipliers.curr(source, {})
            const defenderMultiplier = DPUtils.store().defender_damage_multipliers.curr(source, {})
            let damage = amount
            tags.forEach(tag => damage *= attackerMultiplier[tag] ?? 1)
            tags.forEach(tag => damage *= defenderMultiplier[tag] ?? 1)
            damage *= attackerMultiplier.common ?? 1
            damage *= defenderMultiplier.common ?? 1
            this.ENTITIES.forEach(target => !!target && target.applyDamage(damage, { cause: EntityDamageCause.entityAttack, damagingEntity: source }))
            return EntityUtils
        }
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
