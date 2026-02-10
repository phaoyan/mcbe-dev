import { Player, world, Entity, GameMode, system } from "@minecraft/server";
import { DPUtils } from "./dp_utils";
import { MathUtils } from "./math_utils";
import { InventoryUtils } from "./inventory_utils";
import { ItemUtils } from "./item_utils";
import { CoinUtils } from "./coin_utils";

/**
 * 任务 ID：建议使用具备语义的字符串
 * - 示例：`sakonji:m1_breathing`、`trial:tier2_fujishiroyama`
 */
export type MissionId = string;

/**
 * 任务状态
 * - locked:   尚未解锁（默认）
 * - available:已解锁，可接取
 * - accepted: 已接取，进行中
 * - turn_in:  已完成目标，待交付
 * - rewarded: 已交付并领取奖励，任务闭环
 */
export type MissionStatus = "locked" | "available" | "accepted" | "turn_in" | "rewarded";

/**
 * NPC 任务中关于“接取”或“完成”时的奖励/逻辑配置
 */
export interface MissionActionConfig {
    title: string;
    rewards?: ItemUtils[];
    coins?: number;
    experience?: number;
    sound?: string;
    extra?: (player: Player) => void;
}

/**
 * 单个任务在 NPC 侧的展示与逻辑配置
 */
export interface NpcMissionConfig {
    id: MissionId;
    title: string;
    status: MissionStatus;
    /**
     * 可选：任务对话结构/配置（用于工具生成或脚本侧声明式配置）
     * - 不参与 MissionUtils 的核心逻辑
     */
    dialogue?: any;
    scenes: {
        accept: string;
        turnin?: string;
        reward?: string;
    };
    events: Record<string, (player: Player, npc: Entity) => void>;
    init?: () => void;
    unlocks?: string[];
}

/**
 * NPC 整体任务组配置
 */
export interface NpcQuestConfig {
    defaultScene: string;
    missions: Record<string, NpcMissionConfig>;
}

/**
 * 单个任务记录
 * progress 使用 any，允许每个任务自行定义结构
 */
export interface MissionRecord {
    id: MissionId;
    status: MissionStatus;
    progress?: any;
}

/**
 * 玩家全部任务数据
 */
export interface PlayerMissions {
    /**
     * 统一存储：以任务 id 作为 key
     */
    records: { [id: string]: MissionRecord | undefined };
    /**
     * 当前主线任务编号（可选，主要用于 UI 或分支判断）
     */
    currentMainId?: MissionId;
}

const EMPTY_MISSIONS: PlayerMissions = {
    records: {},
};

export class MissionUtils {
    /**
     * 读取玩家当前任务数据（自动带默认结构）
     */
    static getAll(player: Player): PlayerMissions {
        const dp = DPUtils.store().player_current_missions;
        // 兼容：玩家初始没有设置 player_current_missions 时，curr 会返回 placeholder，但 DP 仍是 undefined
        const hasDp = player.getDynamicProperty(dp.id) !== undefined;
        const raw = dp.curr(player, undefined) as any;

        // 只支持新结构：{ records, currentMainId? }
        const safe: PlayerMissions = {
            records: { ...((raw?.records as PlayerMissions["records"]) ?? {}) },
            currentMainId: typeof raw?.currentMainId === "string" ? (raw.currentMainId as MissionId) : undefined,
        };

        if (!hasDp) {
            // 写回：初始化（保证后续逻辑总能读到 player_current_missions）
            this.setAll(player, safe);
        }
        return safe;
    }

    /**
     * 写回玩家任务数据
     */
    static setAll(player: Player, missions: PlayerMissions) {
        DPUtils.store().player_current_missions.set(player, missions, EMPTY_MISSIONS);
    }

    /**
     * 获取单个任务记录
     */
    static getMission(player: Player, id: MissionId): MissionRecord | undefined {
        const missions = this.getAll(player);
        return missions.records[id];
    }

    /**
     * 更新 / 创建任务记录（由 updater 决定具体结构）
     */
    static updateMission(
        player: Player,
        id: MissionId,
        updater: (prev: MissionRecord | undefined) => MissionRecord,
    ): MissionRecord {
        const missions = this.getAll(player);
        const prev = missions.records[id];
        const next = updater(prev);
        missions.records[id] = { ...next, id };
        this.setAll(player, missions);
        return missions.records[id]!;
    }

    /**
     * 设置任务状态（可选传入 progress 或 progressUpdater）
     */
    static setStatus(
        player: Player,
        id: MissionId,
        status: MissionStatus,
        progress?: any | ((prev: any) => any),
    ): MissionRecord {
        return this.updateMission(player, id, (prev) => {
            const nextProgress =
                typeof progress === "function" ? progress(prev?.progress) : (progress ?? prev?.progress);

            return {
                id,
                status,
                progress: nextProgress,
            };
        });
    }

    /** 标记任务为 available（已解锁，可接取） */
    static markAvailable(
        player: Player,
        id: MissionId,
        fn?: (record: MissionRecord) => void
    ): MissionRecord {
        const rec = this.setStatus(player, id, "available");
        fn?.(rec);
        return rec;
    }

    /** 标记任务为 accepted（已接取，进行中） */
    static markAccepted(
        player: Player,
        id: MissionId,
        data?: {
            title: string;
            /**
             * 接取即发放的物品（例如“接取任务时给材料”）
             * - 命名沿用 rewarded 侧的 rewards，便于统一配置
             */
            rewards?: ItemUtils[];
            coins?: number;
            /** 接取即发放的经验（可选） */
            experience?: number;
            extra?: (player: Player)=>void;
        }
    ): MissionRecord {
        const rec = this.setStatus(player, id, "accepted");
        const rewardData = data;
        rewardData && MissionUtils.missionAcceptedFeedback(player, rewardData);
        return rec;
    }

    /** 标记任务为 turn_in（目标已完成，待交付） */
    static markTurnIn(
        player: Player,
        id: MissionId,
        fn?: (record: MissionRecord) => void
    ): MissionRecord {
        const rec = this.setStatus(player, id, "turn_in");
        fn?.(rec);
        return rec;
    }

    /** 标记任务为 rewarded（已交付并领取奖励） */
    static markRewarded(
        player: Player,
        id: MissionId,
        data?: {
            title: string;
            rewards?: ItemUtils[];
            coins?: number;
            experience?: number;
            sound?: string;
            extra?: (player: Player)=>void;
        }
    ): MissionRecord {
        const rec = this.setStatus(player, id, "rewarded");
        const rewardData = data;
        rewardData && MissionUtils.missionRewardedFeedback(player, rewardData);
        return rec;
    }

    /**
     * 对某任务的 progress 字段进行自定义操作
     * @param player 玩家
     * @param id 任务ID
     * @param updater progress 字段的更新函数 (接受当前 progress，返回新的 progress)
     * @returns 更新后的 MissionRecord
     */
    static updateProgress(
        player: Player,
        id: MissionId,
        updater: (prevProgress: any) => any
    ): MissionRecord {
        return this.updateMission(player, id, (prev: any) => {
            return {
                ...prev,
                progress: updater(prev?.progress),
            };
        });
    }

    /**
     * 设置当前主线任务编号
     */
    static setCurrentMain(player: Player, id: MissionId | undefined) {
        const missions = this.getAll(player);
        missions.currentMainId = id;
        this.setAll(player, missions);
    }

    /**
     * 读取当前主线任务编号
     */
    static getCurrentMain(player: Player): MissionId | undefined {
        return this.getAll(player).currentMainId;
    }

    static missionAcceptedFeedback(player: Player, data: {
        title: string;
        rewards?: ItemUtils[];
        coins?: number;
        experience?: number;
        extra?: (player: Player)=>void;
    }) {
        player.onScreenDisplay.setTitle(MathUtils.fontColor(`${data.title}\n -- Accepted --`, "green"))
        if (data.rewards) {
            for (const reward of data.rewards) {
                InventoryUtils.give(player, reward.get());
            }
        }
        if (data.coins) {
            CoinUtils.addCoins(player, data.coins);
        }
        if (data.experience) {
            player.addExperience(data.experience);
        }
        data.extra?.(player);
    }

    static missionRewardedFeedback(player: Player, data: {
        title: string;
        rewards?: ItemUtils[];
        coins?: number;
        experience?: number;
        sound?: string;
        extra?: (player: Player)=>void;
    }) {
        player.onScreenDisplay.setTitle(MathUtils.fontColor(`${data.title}\n -- Completed --`, "yellow"))
        if (data.rewards) {
            for (const reward of data.rewards) {
                InventoryUtils.give(player, reward.get());
            }
        }
        if (data.coins) {
            CoinUtils.addCoins(player, data.coins);
        }
        if (data.experience) {
            player.addExperience(data.experience);
        }
        data.extra?.(player);
        if (data.sound) {
            player.playSound(data.sound);
        }
    }


    static defaultStatus(id: MissionId, status: MissionStatus) {
        const check = (player: Player) => {
            const mission = this.getMission(player, id);
            if (mission) return;
            this.setStatus(player, id, status);
        };
        world.afterEvents.worldLoad.subscribe(() => {
            world.getAllPlayers().forEach(check);
        });
        world.afterEvents.playerSpawn.subscribe((ev) => {
            if (ev.initialSpawn) {
                check(ev.player);
            }
        });
    }
}

export class NpcUtils {
    static NPC_STATES: {
        [key: string]: (player: Player, npc: Entity) => string
    } = {}

    static NPC_BUSY: Record<string, { playerId: string; untilTick: number } | undefined> = {}

    static register(npcId: string, quests: NpcQuestConfig){
        this.scenes(npcId, this.router(quests))
        world.afterEvents.worldLoad.subscribe(() => {
            Object.values(quests.missions).forEach((m: NpcMissionConfig) => {
                m.init?.();
                NpcUtils.events(m.events);
                MissionUtils.defaultStatus(m.id, m.status);
            })
        })
    }

    static scenes(
        npcId: string,
        router: (player: Player, npc: Entity) => string,
    ) {
        this.NPC_STATES[npcId] = router
    }

    static event(eventId: string, callback: (player: Player, npc: Entity) => void) {
        this.dialogueCallbacks[eventId] = callback
    }

    static events(events: { [key: string]: (player: Player, npc: Entity) => void }) {
        Object.entries(events).forEach(([eventId, callback]) => {
            this.event(eventId, callback)
        })
    }

    static router(quests: NpcQuestConfig) {
        return (player: Player, _npc: Entity): string => {
            for (const key of Object.keys(quests.missions)) {
                const q = quests.missions[key];
                const rec = MissionUtils.getMission(player, q.id);
                const status = rec?.status ?? q.status;
        
                // 未解锁：跳过
                if (!status || status === "locked") continue;
        
                // 仅解锁：走当前任务的起始对话
                if (status === "available") {
                    return q.scenes.accept;
                }
                // 进行中：回到“是否完成”询问节点
                if (status === "accepted") {
                    return q.scenes.turnin || q.scenes.accept;
                }
                // 已完成待交付：优先展示完成对话
                if (status === "turn_in") {
                    return q.scenes.reward || q.scenes.accept;
                }
                // rewarded：继续看下一条主线
            }
            return quests.defaultScene || "";
        };
    }

    static dialogueCallbacks: { [key: string]: (player: Player, npc: Entity) => void } = {}

    static startDialogue(player: Player, npc: Entity, scene: string) {
        const now = system.currentTick;
        const busy = NpcUtils.NPC_BUSY[npc.id];
        if (busy && busy.untilTick > now && busy.playerId !== player.id) {
            player.onScreenDisplay.setActionBar(MathUtils.fontColor("This NPC is busy. Try again in a moment.", "yellow"))
            return
        }

        NpcUtils.NPC_BUSY[npc.id] = { playerId: player.id, untilTick: now + 200 }
        npc.addTag(npc.id)
        if (player.getGameMode() === GameMode.Creative) {
            player.setGameMode(GameMode.Survival)
            DPUtils.store().npc_initiator.set(npc, player.id)
            npc.runCommand(`dialogue change @s ${scene}`)
            player.runCommand(`dialogue open @e[tag="${npc.id}"] @s ${scene}`)
            player.setGameMode(GameMode.Creative)
        }
        else {
            DPUtils.store().npc_initiator.set(npc, player.id)
            npc.runCommand(`dialogue change @s ${scene}`)
            player.runCommand(`dialogue open @e[tag="${npc.id}"] @s ${scene}`)
        }
    }

    static dialogue(scene: string){
        return (player: Player, npc: Entity)=>this.startDialogue(player, npc, scene)
    }

}

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (!sourceEntity) return
    if (Object.keys(NpcUtils.dialogueCallbacks).includes(id)) {
        const npc = sourceEntity as Entity
        if (id.endsWith("_close")) {
            delete NpcUtils.NPC_BUSY[npc.id]
        }
        const player = world.getEntity(DPUtils.store().npc_initiator.curr(npc)) as Player
        if (!player) return
        NpcUtils.dialogueCallbacks[id](player, npc)
    }
})

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    Object.entries(NpcUtils.NPC_STATES)
        .filter(([npcId]) => npcId === target.typeId)
        .forEach(([_, resolver]) => {
            const sceneId = resolver(player, target as Entity)
            if (!sceneId) return
            NpcUtils.startDialogue(player, target as Entity, sceneId)
        })
})
