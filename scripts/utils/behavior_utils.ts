import { Entity, system, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";

export interface BehaviorController {
    initial: string
    behaviors: { [key: string]: (entity: Entity) => void }
    transitions: { [key: string]: (entity: Entity) => string }
}

export class BehaviorUtils {
    static behaviorMap: { [key: string]: BehaviorController } = {}

    static register(entityId: string, controller: BehaviorController) {
        this.behaviorMap[entityId] = controller
    }

    static single(entityId: string, behavior: (entity: Entity) => void) {
        this.register(entityId, {
            initial: "state",
            behaviors: {
                state: behavior
            },
            transitions: {
                state: () => "state"
            }
        })
    }

    static dual(
        entityId: string,
        params: {
            off: (entity: Entity) => void,
            on: (entity: Entity) => void,
            transition: (entity: Entity) => boolean
        }
    ) {
        this.register(entityId, {
            initial: "off",
            behaviors: {
                off: params.off,
                on: params.on
            },
            transitions: {
                off: (entity: Entity) => params.transition(entity) ? "on" : "off",
                on: (entity: Entity) => params.transition(entity) ? "on" : "off"
            }
        })
    }

    static dualTargetState(entityId: string, off: (entity: Entity) => void, on: (entity: Entity) => void) {
        this.dual(entityId, { off, on, transition: (entity: Entity) => DPUtils.store().mob_has_target.curr(entity, false) })
    }
}

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId !== "event:timer") return
    const controller = BehaviorUtils.behaviorMap[entity.typeId]
    if (!controller) return
    let state = DPUtils.store().mob_behavior_state.curr(entity)
    if (!Object.keys(controller.behaviors).includes(state)) state = controller.initial
    controller.behaviors[state](entity)
    DPUtils.store().mob_behavior_state.set(entity, controller.transitions[state](entity))
})