import { Vector3Utils } from "@minecraft/math";
import { Entity, EntityEffectOptions, Vector3 } from "@minecraft/server";
import { VecUtils } from "./vec_utils";

export class EntityUtils {
    static ENTITIES: Entity[]
    static entities(entity: Entity, maxDist: number = 128, closest?: number) {
        this.ENTITIES = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: maxDist,
            excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
            excludeFamilies: ["projectile", "dummy"],
            closest: closest
        }).filter(e => e.id !== entity.id)
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

    static get() {
        return this.ENTITIES
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
