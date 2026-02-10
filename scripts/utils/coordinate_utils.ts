import { Entity, Player, Vector3, world } from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";
import { Vector3Utils } from "@minecraft/math";
import { DPUtils } from "./dp_utils";
import { TimeUtils } from "./time_utils";
import { VecUtils } from "./math_utils";

type KDNode2D<T> = {
    p: { x: number; y: number };
    data: T;
    axis: number; // 0 for x, 1 for y
    left?: KDNode2D<T>;
    right?: KDNode2D<T>;
};

/**
 * KDTree2D：二维 KD-Tree（支持动态插入并存储附加数据）
 */
export class KDTree2D<T = any> {
    private _root: KDNode2D<T> | undefined;
    private _size = 0;

    size() {
        return this._size;
    }

    clear() {
        this._root = undefined;
        this._size = 0;
    }

    /**
     * 添加二维点及其对应数据。
     */
    add(point: { x: number; y: number }, data: T): KDTree2D<T>;
    add(x: number, y: number, data: T): KDTree2D<T>;
    add(a: { x: number; y: number } | number, b: any, c?: any): KDTree2D<T> {
        const p = typeof a === "number" ? { x: a, y: b } : a;
        const data: T = typeof a === "number" ? c : b;

        if (!this._root) {
            this._root = { p, data, axis: 0 };
            this._size = 1;
            return this;
        }

        let node = this._root;
        while (true) {
            const axis = node.axis;
            const pv = axis === 0 ? p.x : p.y;
            const nv = axis === 0 ? node.p.x : node.p.y;
            const nextAxis = axis === 0 ? 1 : 0;

            if (pv < nv) {
                if (node.left) {
                    node = node.left;
                    continue;
                }
                node.left = { p, data, axis: nextAxis };
                break;
            } else {
                if (node.right) {
                    node = node.right;
                    continue;
                }
                node.right = { p, data, axis: nextAxis };
                break;
            }
        }

        this._size += 1;
        return this;
    }

    /**
     * 半径范围查询。
     * 返回包含点坐标和附加数据的对象数组。
     */
    queryRadius(center: { x: number; y: number }, r: number): { p: { x: number; y: number }; data: T }[];
    queryRadius(x: number, y: number, r: number): { p: { x: number; y: number }; data: T }[];
    queryRadius(a: { x: number; y: number } | number, b: number, c?: number): { p: { x: number; y: number }; data: T }[] {
        const center = typeof a === "number" ? { x: a, y: b } : a;
        const r = typeof a === "number" ? (c ?? 0) : b;
        const r2 = r * r;

        const res: { p: { x: number; y: number }; data: T }[] = [];
        if (!this._root || r < 0) return res;

        const stack: KDNode2D<T>[] = [this._root];
        while (stack.length > 0) {
            const node = stack.pop()!;
            const dx = node.p.x - center.x;
            const dy = node.p.y - center.y;
            const d2 = dx * dx + dy * dy;
            if (d2 <= r2) res.push({ p: node.p, data: node.data });

            const axis = node.axis;
            const diff = (axis === 0 ? center.x : center.y) - (axis === 0 ? node.p.x : node.p.y);
            const diff2 = diff * diff;

            const near = diff < 0 ? node.left : node.right;
            const far = diff < 0 ? node.right : node.left;

            if (near) stack.push(near);
            if (far && diff2 <= r2) stack.push(far);
        }

        return res;
    }
}

/**
 * CoordinateType：坐标检测类型，定义了检测半径和检测周期（ticks）
 */
export enum CoordinateType {
    RANGE_16_20 = "RANGE_16_20",
    RANGE_32_20 = "RANGE_32_20",
    RANGE_32_40 = "RANGE_32_40",
    RANGE_64_20 = "RANGE_64_20",
    RANGE_64_100 = "RANGE_64_100",
    RANGE_128_40 = "RANGE_128_40",
    RANGE_128_100 = "RANGE_128_100",
    RANGE_128_200 = "RANGE_128_200",
    RANGE_128_400 = "RANGE_128_400",
    RANGE_256_200 = "RANGE_256_200",
    RANGE_512_200 = "RANGE_512_200",
}


const TYPE_CONFIGS = {
    RANGE_16_20: { radius: 16, ticks: 20 },
    RANGE_32_20: { radius: 32, ticks: 20 },
    RANGE_32_40: { radius: 32, ticks: 40 },
    RANGE_64_20: { radius: 64, ticks: 20 },
    RANGE_64_100: { radius: 64, ticks: 100 },
    RANGE_128_40: { radius: 128, ticks: 40 },
    RANGE_128_100: { radius: 128, ticks: 100 },
    RANGE_128_200: { radius: 128, ticks: 200 },
    RANGE_128_400: { radius: 128, ticks: 400 },
    RANGE_256_200: { radius: 256, ticks: 200 },
    RANGE_512_200: { radius: 512, ticks: 200 },
};

/**
 * CoordinateUtil：坐标注册与触发工具
 */
export class CoordinateUtils {
    private static trees = new Map<string, KDTree2D<(player: Player) => void>>();

    static {
        // 初始化所有类型的树
        for (const type of Object.keys(TYPE_CONFIGS)) {
            this.trees.set(type, new KDTree2D());
        }
    }

    /**
     * 注册一个坐标点及其触发时的回调函数
     * @param type 触发类型（包含半径和周期），默认为 Range64 (64格20tick)
     */
    static register(x: number, y: number, callback: (player: Player) => void, type: string): void {
        const tree = this.trees.get(type);
        if (tree) {
            tree.add(x, y, callback);
        }
    }

    /**
     * 初始化定时检测逻辑
     */
    static init() {
        for (const [type, config] of Object.entries(TYPE_CONFIGS)) {
            const tree = this.trees.get(type)!;
            const { radius, ticks } = config;

            TimeUtils.timer((player) => {
                if (!player.isValid || tree.size() === 0) return;
                const playerPos = player.location;
                // 直接使用该类型定义的半径进行查询
                const results = tree.queryRadius(playerPos.x, playerPos.z, radius);
                results.forEach(res => {
                    try {
                        res.data(player);
                    } catch (e) {
                        console.error(`CoordinateUtil callback error [Type:${type}] at [${res.p.x}, ${res.p.y}]: ${e}`);
                    }
                });
            }, ticks);
        }
    }
}

export class CoordinateEventTemplates {
    private static CHESTS: Record<string, { id: string; type: string; loc: Vector3; filter?: (player: Player) => boolean; onOpen: (player: Player, chest: Entity) => boolean | void }> = {}
    private static CHEST_INTERACT_INIT = false

    /**
     * 实现“只执行一次”逻辑的模板。
     * 基于 world 的 DynamicProperty (DP) 进行持久化，确保逻辑在整个世界生命周期内只运行一次。
     */
    static once(id: string, callback: (player: Player) => boolean | void): (player: Player) => void {
        return (player: Player) => {
            const dpKey = `once_${id}`;
            if (world.getDynamicProperty(dpKey)) return;
            if (callback(player) !== false) {
                world.setDynamicProperty(dpKey, true);
            }
        };
    }

    /**
     * 实现具有冷却时间的重复触发逻辑。
     * 基于 world 的 DynamicProperty 进行持久化，确保冷却时间在服务器重启后依然有效。
     */
    static cooldown(id: string, cooldownTicks: number, callback: (player: Player) => boolean | void): (player: Player) => void {
        return (player: Player) => {
            const dpKey = `cd_${id}`;
            const nextTick = world.getDynamicProperty(dpKey) as number ?? 0;
            if (world.getAbsoluteTime() < nextTick) return;
            
            if (callback(player) !== false) {
                world.setDynamicProperty(dpKey, world.getAbsoluteTime() + cooldownTicks);
            }
        };
    }

    static registerOnceAt(x: number, z: number, type: string, id: string, callback: (player: Player) => boolean | void) {
        CoordinateUtils.register(x, z, this.once(id, callback), type);
    }

    static registerCooldownAt(x: number, z: number, type: string, id: string, cooldownTicks: number, callback: (player: Player) => boolean | void) {
        CoordinateUtils.register(x, z, this.cooldown(id, cooldownTicks, callback), type);
    }

    static registerNpc(npcs: { id: string; type: string; loc: Vector3; facing: [number, number] }[]) {
        for (const coordinate of npcs) {
            const loc = coordinate.loc;
            this.registerOnceAt(loc.x, loc.z, CoordinateType.RANGE_64_20, `ns_ds:npc_gen_${coordinate.id}`, () => {
                try {
                    const npc = world.getDimension(MinecraftDimensionTypes.Overworld).spawnEntity(coordinate.type, loc);
                    const dialogueName = `${npc.typeId.replace("ns_ds:mob_npc_", "")}_initial`;
                    TimeUtils.timeout(() => {
                        if (npc && npc.isValid) npc.runCommand(`dialogue change @s ${dialogueName}`);
                    }, 10);
                    TimeUtils.timeout(() => {
                        if (npc && npc.isValid) npc.teleport(loc, {
                            facingLocation: {
                                x: loc.x + coordinate.facing[0],
                                y: loc.y,
                                z: loc.z + coordinate.facing[1],
                            }
                        });
                    }, 5);
                } catch (e) {
                    return false;
                }
            });
        }
    }

    static registerChest(chest: { id: string; type: string; loc: Vector3; filter?: (player: Player) => boolean; onOpen: (player: Player, chest: Entity) => boolean | void }): void;
    static registerChest(chests: { id: string; type: string; loc: Vector3; filter?: (player: Player) => boolean; onOpen: (player: Player, chest: Entity) => boolean | void }[]): void;
    static registerChest(arg: { id: string; type: string; loc: Vector3; filter?: (player: Player) => boolean; onOpen: (player: Player, chest: Entity) => boolean | void } | { id: string; type: string; loc: Vector3; filter?: (player: Player) => boolean; onOpen: (player: Player, chest: Entity) => boolean | void }[]) {
        const chests = Array.isArray(arg) ? arg : [arg]
        chests.forEach(chest => {
            this.CHESTS[chest.id] = chest

            const loc = chest.loc;
            this.registerOnceAt(loc.x, loc.z, CoordinateType.RANGE_64_100, `ns_ds:chest_gen_${chest.id}`, (player) => {
                if (chest.filter && !chest.filter(player)) return false;
                const targetLoc = VecUtils.start({
                    x: loc.x + 0.5,
                    y: loc.y,
                    z: loc.z + 0.5,
                }).moveYToBlock(10, 10).end()
                const existing = player.dimension.getEntities({
                    location: targetLoc,
                    maxDistance: 2,
                    type: chest.type,
                });
                if (existing.length > 0) return false;

                try {
                    const entity = player.dimension.spawnEntity(chest.type, targetLoc);
                    DPUtils.store().decoration_chest_id.set(entity, chest.id);
                } catch (e) {
                    return false;
                }
            });
        })

        if (this.CHEST_INTERACT_INIT) return
        this.CHEST_INTERACT_INIT = true

        world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
            const chestId = DPUtils.store().decoration_chest_id.curr(target);
            if (!chestId) return;

            const chest = this.CHESTS[chestId];
            if (!chest) return;

            chest.onOpen(player, target);
        });
    }

    static registerMaterials(
        materials: { id: string; type: string; loc: Vector3; cooldown: number; filter?: (player: Player) => boolean; onCollect: (player: Player, entity: Entity) => boolean | void }[],
        type: string = CoordinateType.RANGE_64_100
    ) {
        const materialsMap: Record<string, typeof materials[number]> = {}
        materials.forEach(m => materialsMap[m.id] = m)

        materials.forEach(material => {
            const loc = material.loc;
            CoordinateUtils.register(loc.x, loc.z, (player: Player) => {
                if (material.filter && !material.filter(player)) return;

                const dpKey = `cd_ns_ds:material_${material.id}`
                const nextTick = world.getDynamicProperty(dpKey) as number ?? 0;
                if (world.getAbsoluteTime() < nextTick) return;
                const targetLoc = VecUtils.start({
                    x: loc.x + 0.5,
                    y: loc.y,
                    z: loc.z + 0.5,
                }).moveYToBlock(10, 10).end()
                const existing = player.dimension.getEntities({
                    location: targetLoc,
                    maxDistance: 2,
                    type: material.type,
                });
                if (existing.length > 0) return;

                try {
                    const entity = player.dimension.spawnEntity(material.type, targetLoc);
                    DPUtils.store().decoration_material_id.set(entity, material.id);
                } catch (e) {
                    return;
                }
            }, type);
        })

        world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
            const materialId = DPUtils.store().decoration_material_id.curr(target);
            if (!materialId) return;

            const material = materialsMap[materialId];
            if (!material) return;

            if (material.onCollect(player, target) !== false) {
                const dpKey = `cd_ns_ds:material_${material.id}`
                world.setDynamicProperty(dpKey, world.getAbsoluteTime() + material.cooldown);
            }
        });
    }


    static registerFight(fights: Record<string, { loc: Vector3; radius: number; cooldown: number; mobs: string[]; filter?: (player: Player) => boolean; spawnLoc?: Vector3 }>, particle: string) {
        Object.entries(fights).forEach(([key, data]) => {
            const type = data.radius > 16 ? CoordinateType.RANGE_128_40 : CoordinateType.RANGE_16_20;
            this.registerCooldownAt(data.loc.x, data.loc.z, type, `ns_ds:fight_${key}`, data.cooldown, (player: Player) => {
                if (player.dimension.id !== MinecraftDimensionTypes.Overworld) return false;
                if (data.filter && !data.filter(player)) return false;
                const dist = Vector3Utils.distance(player.location, data.loc);
                if (dist > data.radius) return false;
                try {
                    const spawnLoc = data.spawnLoc ?? data.loc;
                    data.mobs.forEach((mob: string) => {
                        const spawnPos = key === "final_oni5_boss" ? spawnLoc : {
                            x: (Math.random() - 0.5) * data.radius * 0.5 + spawnLoc.x,
                            y: spawnLoc.y,
                            z: (Math.random() - 0.5) * data.radius * 0.5 + spawnLoc.z,
                        };
                        player.dimension.spawnEntity(mob, spawnPos);
                        player.dimension.spawnParticle(particle, spawnPos);
                    });
                    return true;
                } catch (e) {
                    return false;
                }
            });
        });
    }
}

// 订阅世界加载事件以启动定时器
world.afterEvents.worldLoad.subscribe(() => {
    CoordinateUtils.init();
});
