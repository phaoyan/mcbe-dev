// import { BehaviorTemplates, BehaviorUtils, NodeState } from "../utils/behavior_utils";
// import { GameMode, Player, world } from "@minecraft/server";
// import { DPUtils } from "../utils/dp_utils";
// import { EntityOperations, EntityUtils } from "../utils/entity_utils";
// import animation_ids from "../json/animation_ids.json";
// import { MinecraftEntityTypes } from "@minecraft/vanilla-data";
// import { EntityEventIds } from "../lists/event_list";
// import entity_ids from "../json/entity_ids.json";
// import { TimeUtils } from "../utils/time_utils";
// import { CompUtils } from "../utils/comp_utils";

// BehaviorUtils.register("blinded_deceiver", () => BehaviorTemplates.monster({
//     skills: [
//         {
//             id: "stab",
//             cooldown: 200,
//             duration: 65,
//             filter: (entity) => (
//                 DPUtils.store().mob_has_target.curr(entity) &&
//                 EntityOperations.entity(entity).getTargets(4).length > 0
//             ),
//             action: (entity) => {
//                 EntityOperations.entity(entity).slowness(65, 5)
//                 entity.playAnimation(animation_ids.exp_behavior.owl_form.stab)
//                 return NodeState.SUCCESS
//             }
//         },
//         {
//             id: "slash",
//             cooldown: 200,
//             duration: 43,
//             filter: (entity) => (
//                 DPUtils.store().mob_has_target.curr(entity) &&
//                 EntityOperations.entity(entity).getTargets(4).length > 0
//             ),
//             action: (entity) => {
//                 EntityOperations.entity(entity).slowness(43, 5)
//                 entity.playAnimation(animation_ids.exp_behavior.owl_form.slash)
//                 return NodeState.SUCCESS
//             }
//         }
//     ],
//     deathAction: (entity) => {
//         entity.clearVelocity()
//         entity.playAnimation(animation_ids.exp_behavior.owl_form.death)
//         TimeUtils.timeout(()=>entity.remove(),30)
//         return NodeState.SUCCESS
//     },
//     moveToTarget: (entity) => {
//         entity.triggerEvent(EntityEventIds.Fight)
//         return NodeState.SUCCESS
//     },
//     findTarget: (entity) => {
//         const target = EntityUtils.entitiesByType(entity, MinecraftEntityTypes.Player, 32).first()
//         if (!target || (target as Player).getGameMode() === GameMode.Creative) return NodeState.FAILURE
//         EntityOperations.entity(target).setTargetedBy(entity)
//         return NodeState.SUCCESS
//     },
//     idleBehavior: (entity) => {
//         (!CompUtils.variant(entity) || CompUtils.variant(entity).value !== 0) && entity.triggerEvent(EntityEventIds.Idle)
//         return NodeState.SUCCESS
//     }
// }))

// world.afterEvents.entitySpawn.subscribe(({ entity }) => {
//     if (entity.typeId !== entity_ids.blinded_deceiver) return
//     BehaviorUtils.bind(entity.id, "blinded_deceiver")
// })