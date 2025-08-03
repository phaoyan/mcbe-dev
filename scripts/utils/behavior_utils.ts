import { Entity, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EventIds } from "../lists/event_list";

export interface BehaviorController {
    initial: string
    behaviors: { [key: string]: (entity: Entity) => void }
    transitions: { [key: string]: {[key: string]: (entity: Entity) => boolean} }
}

export class BehaviorUtils {
    static BEHAVIOR_MAP: { [key: string]: BehaviorController } = {}

    static TARGET: BehaviorController | undefined

    static register(entityId: string) {
        this.TARGET && (this.BEHAVIOR_MAP[entityId] = this.TARGET) && (this.TARGET = undefined)
    }

    static init(initial: string) {
        if (!this.TARGET) this.TARGET = { initial: initial, behaviors: {}, transitions: {} }
        else this.TARGET.initial = initial
        return BehaviorUtils
    }

    static behavior(state: string, behavior: (entity: Entity) => void) {
        if (!this.TARGET) return BehaviorUtils
        else this.TARGET.behaviors[state] = behavior
        return BehaviorUtils
    }

    static transition(state: string, transition: {[key: string]: (entity: Entity) => boolean}) {
        if (!this.TARGET) return BehaviorUtils
        else this.TARGET.transitions[state] = transition
        return BehaviorUtils
    }

    static initSingle(behavior: (entity: Entity) => void) {
        this.init("state").behavior("state", behavior).transition("state", {state: (entity: Entity)=>true})
        return BehaviorUtils
    }

    static initTarget(targetAquired: (entity: Entity) => void, targetEscape: (entity: Entity) => void) {
        this.init("no_target")
            .behavior("no_target", targetEscape)
            .behavior("has_target", targetAquired)
            .transition("no_target", {has_target: (entity: Entity)=>DPUtils.store().mob_has_target.curr(entity)})
            .transition("has_target", {no_target: (entity: Entity)=>!DPUtils.store().mob_has_target.curr(entity)})
        return BehaviorUtils
    }

    static death(death: (entity: Entity) => void) {
        const states = Object.keys(this.TARGET?.behaviors ?? {})
        this.behavior("death", death)
        states.forEach(state=>this.transition(state, {death: (entity: Entity)=>DPUtils.store().mob_dead.curr(entity)}))
        return BehaviorUtils
    }
}

// 监听Timer
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId !== EventIds.Timer) return
    const controller = BehaviorUtils.BEHAVIOR_MAP[entity.typeId]
    if (!controller) return
    let state = DPUtils.store().mob_behavior_state.curr(entity)
    if (!Object.keys(controller.behaviors).includes(state)) state = controller.initial
    controller.behaviors[state](entity)
    Object.entries(controller.transitions[state]).forEach(([target, transition])=>{
        transition(entity) && DPUtils.store().mob_behavior_state.set(entity, target)
    })
})

// 监听Death
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId !== EventIds.Death) return
    DPUtils.store().mob_dead.set(entity, true)
})

// 监听TargetAcquired
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId !== EventIds.TargetAcquired) return
    DPUtils.store().mob_has_target.set(entity, true)
})

// 监听TargetEscape
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId !== EventIds.TargetEscape) return
    DPUtils.store().mob_has_target.set(entity, false)
})
