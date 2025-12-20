import { Entity, world } from "@minecraft/server"
import { DPUtils } from "./dp_utils"


export class StateUtils {
    static STATES: { [key: string]: { on: (entity: Entity)=>void, off: (entity: Entity)=>void } } = {}

    static register(data: {
        stateId: string
        on: (entity: Entity)=>void
        off: (entity: Entity)=>void
    }){
        this.STATES[data.stateId] = { on: data.on, off: data.off }
    }

    static statebinds(data: {
        statebindId: string
        triggers: string | string[]
        mapping: (target: Entity) => string
    }){
        const triggers = Array.isArray(data.triggers) ? data.triggers : [data.triggers]
        world.afterEvents.worldLoad.subscribe(() => {
            triggers.forEach(trigger=>{
                DPUtils.register(trigger, (target, curr, prev) => {
                    if (prev === curr) return
                    if (!(target instanceof Entity)) return
                    const prevState = DPUtils.store().player_prev_state.curr(target, {})[data.statebindId]
                    const currState = data.mapping(target)
                    if (prevState === currState) return
                    if (prevState) this.STATES[prevState]?.off(target)
                    if (currState) this.STATES[currState]?.on(target)
                    DPUtils.store().player_prev_state.set(target, (curr: any) => ({ ...curr, [data.statebindId]: currState }), prevState)
                })
            })
        })
    }
}