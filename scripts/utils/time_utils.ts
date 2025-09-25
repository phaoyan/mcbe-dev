import { Player, system, world } from "@minecraft/server";

export const TIMEOUT_TRYCATCH = true



export class TimeUtils {
    static ticks(start: number, step: number, length: number) {
        return Array.from({ length }, (_, i) => start + i * step);
    }

    static timeout(callback: () => void, tick: number) {
        if (TIMEOUT_TRYCATCH) {
            if (tick === 0) {
                try { callback() } catch { }
                return TimeUtils
            }
            system.runTimeout(()=>{try{callback()}catch{}}, tick)
        } else {
            if (tick === 0) {
                callback()
                return TimeUtils
            }
            system.runTimeout(callback, tick)
        }
        return TimeUtils
    }

    static timeseries<T>(
        callback: (param: T | undefined, index: number) => void,
        ticks: number[],
        params: (T | undefined)[] = [],
    ) {
        if (params.length < ticks.length)
            params = ticks.map((_, i) => i < params.length ? params[i] : undefined)
        ticks.forEach((tick, index) => TimeUtils.timeout(()=>{callback(params[index], index)}, tick))
        return TimeUtils
    }

    static timer(callback: (player: Player) => void, interval: number) {
        system.runInterval(()=>{
            world.getAllPlayers().forEach(player=>{
                callback(player)
            })
        }, interval)
    }
}