import { BehaviorTemplates, BehaviorUtils, NodeState } from "../utils/behavior_utils";
import { GameMode, Player, system, world } from "@minecraft/server";
import { DPUtils } from "../utils/dp_utils";
import animation_ids from "../json/animation_ids.json";
import { MinecraftEntityTypes } from "@minecraft/vanilla-data";
import { EntityEventIds } from "../lists/event_list";
import entity_ids from "../json/entity_ids.json";
import { TimeUtils } from "../utils/time_utils";
import { CompUtils } from "../utils/comp_utils";
import { EntityOperation, EntityQuery } from "../utils/entity_utils";
import { DamageRateList } from "../lists/damage_list";

BehaviorUtils.register("blinded_deceiver", () => BehaviorTemplates.monster({
    skills: [
        {
            id: "stab",
            cooldown: 200,
            duration: 65,
            once: true,
            filter: (entity) => (
                !!DPUtils.store().mob_target.curr(entity) &&
                EntityOperation.targetDist(entity) < 4
            ),
            action: (entity) => {
                EntityOperation.create().superarmor(50).run(entity)
                EntityOperation.create().slowness(65, 5).run(entity)
                entity.playAnimation(animation_ids.exp_behavior.owl_form.stab)
                const query = EntityQuery.entities(entity, { dist: 8 })
                const operation = EntityOperation.create().damage(DamageRateList.blinded_deceiver_stab, entity).callable()
                query.sched(operation, TimeUtils.ticks(20,1,100))
                return NodeState.SUCCESS
            }
        },
        {
            id: "slash",
            cooldown: 200,
            duration: 43,
            once: true,
            filter: (entity) => (
                !!DPUtils.store().mob_target.curr(entity) &&
                EntityOperation.targetDist(entity) < 8
            ),
            action: (entity) => {
                console.warn("Slash")
                EntityOperation.create().superarmor(35).run(entity)
                EntityOperation.create().slowness(43, 5).run(entity)
                entity.playAnimation(animation_ids.exp_behavior.owl_form.slash)
                const query = EntityQuery.entities(entity, { dist: 8, offset: [4, 0, 0] })
                const operation = EntityOperation.create().damage(DamageRateList.blinded_deceiver_slash, entity).dizzy(20).callable()
                query.sched(operation, [8, 26])
                return NodeState.SUCCESS
            }
        },
        {
            id: "bind",
            cooldown: 100,
            duration: 45,
            once: true,
            filter: (entity) => (
                !!DPUtils.store().mob_target.curr(entity) &&
                EntityOperation.targetDist(entity) < 8 &&
                EntityOperation.targetDist(entity) < 16
            ),
            action: (entity) => {
                console.warn("Bind")
                const target = EntityOperation.target(entity)
                if (!target) return NodeState.SUCCESS
                entity.playAnimation(animation_ids.exp_behavior.owl_form.bind)
                EntityOperation.create()
                    .slowness(43, 5)
                    .rotateFacing(target, 40)
                    .knockbackToPlace(target, 0.3, 0.8)
                    .run(entity)

                const query = EntityQuery.entities(entity, { dist: 8 })
                const operation1 = EntityOperation.create().damage(DamageRateList.blinded_deceiver_bind_1, entity).callable()
                const operation2 = EntityOperation.create().damage(DamageRateList.blinded_deceiver_bind_2, entity).callable()
                query.sched(operation1, [14])
                query.sched(operation2, [31])
                return NodeState.SUCCESS
            }
        }
    ],
    hurtAction: (entity) => {
        // 受击时：打断移动并播放受伤动画
        entity.playAnimation(animation_ids.exp_behavior.owl_form.hurt)
        EntityOperation.create().dizzy(40).run(entity)
        entity.clearVelocity()
        return NodeState.SUCCESS
    },
    deathAction: (entity) => {
        entity.clearVelocity()
        entity.playAnimation(animation_ids.exp_behavior.owl_form.death)
        TimeUtils.timeout(() => entity.remove(), 30)
        return NodeState.SUCCESS
    },
    moveToTarget: (entity) => {
        entity.triggerEvent(EntityEventIds.Fight)
        return NodeState.SUCCESS
    },
    findTarget: (entity) => {
        const target = EntityQuery.entities(entity, { dist: 32, types: [MinecraftEntityTypes.Player] }).first()
        if (!target || (target as Player).getGameMode() === GameMode.Creative) return NodeState.FAILURE
        EntityOperation.create().setTargetedBy(entity).run(target)
        entity.triggerEvent(EntityEventIds.Fight)
        return NodeState.SUCCESS
    },
    idleBehavior: (entity) => {
        (!CompUtils.variant(entity) || CompUtils.variant(entity).value !== 0) && entity.triggerEvent(EntityEventIds.Idle)
        return NodeState.SUCCESS
    }
}))

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    if (entity.typeId !== entity_ids.blinded_deceiver) return
    BehaviorUtils.bind(entity.id, "blinded_deceiver")
})

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
    if (damagingEntity.typeId === MinecraftEntityTypes.Player) {
        DPUtils.store().entity_sched_id.set(hitEntity, undefined)
    }
})