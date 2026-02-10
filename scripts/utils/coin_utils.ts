import { Player, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { EntityOp } from "./entity_utils";
import { MathUtils } from "./math_utils";

export class CoinUtils {
    /**
     * 获取玩家当前金币数量
     */
    static getCoins(player: Player): number {
        return DPUtils.store().player_coin.curr(player, 0);
    }

    /**
     * 设置玩家金币数量
     */
    static setCoins(player: Player, amount: number): void {
        DPUtils.store().player_coin.set(player, Math.max(0, Math.floor(amount)));
    }

    /**
     * 增加玩家金币
     */
    static addCoins(player: Player, amount: number): void {
        if (amount <= 0) return;
        DPUtils.store().player_coin.set(player, (curr: number) => (curr ?? 0) + Math.floor(amount));
    }

    /**
     * 消耗玩家金币
     * @returns 是否消耗成功
     */
    static consumeCoins(player: Player, amount: number): boolean {
        if (amount <= 0) return true;
        const current = this.getCoins(player);
        if (current < amount) return false;
        
        DPUtils.store().player_coin.set(player, (curr: number) => Math.max(0, (curr ?? 0) - Math.floor(amount)));
        return true;
    }
}


DPUtils.store().player_coin.register((player, curr, prev) => {
    if (prev === curr) return;
    if (!(player instanceof Player)) return;
    EntityOp.create().actionBar(`${MathUtils.fontColor("Coins:", "yellow")} ${prev??0} -> ${curr??0} §r`).run(player);

})