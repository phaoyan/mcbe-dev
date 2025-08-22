import { Entity, world, system, Vector3 } from "@minecraft/server";
import { MathUtils } from "./math_utils";
import { DPUtils } from "./dp_utils";
import { EntityEventIds } from "../lists/event_list";

// 行为树框架
export enum NodeState {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    RUNNING = 'RUNNING'
}

// 行为树调试开关（按需打开）
const BT_TRACE = false;
function btTrace(message: string): void {
    if (!BT_TRACE) return;
    try {
        console.log(`[BT] ${message}`);
    } catch { /* ignore */ }
}

// 每实体运行态存储：按实体隔离节点状态
class RuntimeState {
    private static getAll(entity: Entity): Record<string, any> {
        return DPUtils.store().mob_behavior_state.curr(entity, {});
    }

    private static setAll(entity: Entity, all: Record<string, any>): void {
        DPUtils.store().mob_behavior_state.set(entity, all, {});
    }

    static getVal<T = any>(entity: Entity, node: BehaviorNode, key: string, defaultValue: T): T {
        const path = node.__path ?? node.name;
        const all = this.getAll(entity);
        const nodeState = all[path] ?? {};
        return (key in nodeState ? nodeState[key] : defaultValue) as T;
    }

    static setVal(entity: Entity, node: BehaviorNode, key: string, value: any): void {
        const path = node.__path ?? node.name;
        const all = this.getAll(entity);
        const nodeState = all[path] ?? {};
        nodeState[key] = value;
        all[path] = nodeState;
        this.setAll(entity, all);
    }

    static clearEntity(entity: Entity): void {
        DPUtils.store().mob_behavior_state.set(entity, {});
    }
}

// 移至 MathUtils.distanceSquared

// 节点执行函数类型
export type NodeExecutor = (entity: Entity, children?: BehaviorNode[]) => NodeState;

// 统一的节点接口
export interface BehaviorNode {
    name: string;
    execute: NodeExecutor;
    children: BehaviorNode[];
    reset?: () => void;
    __path?: string;
}

// Blackboard管理类 - 使用DP系统实现持久化
export class BlackboardManager {
    // 获取blackboard数据
    static get(entity: Entity, key: string, defaultValue?: any): any {
        const blackboard = DPUtils.store().mob_blackboard.curr(entity, {});
        return blackboard[key] !== undefined ? blackboard[key] : defaultValue;
    }

    // 设置blackboard数据
    static set(entity: Entity, key: string, value: any): void {
        const blackboard = DPUtils.store().mob_blackboard.curr(entity, {});
        blackboard[key] = value;
        DPUtils.store().mob_blackboard.set(entity, blackboard);
    }

    // 检查blackboard中是否有指定key
    static has(entity: Entity, key: string): boolean {
        const blackboard = DPUtils.store().mob_blackboard.curr(entity, {});
        return blackboard[key] !== undefined;
    }

    // 删除blackboard数据
    static delete(entity: Entity, key: string): void {
        const blackboard = DPUtils.store().mob_blackboard.curr(entity, {});
        delete blackboard[key];
        DPUtils.store().mob_blackboard.set(entity, blackboard);
    }

    // 清空实体的所有blackboard数据
    static clear(entity: Entity): void {
        DPUtils.store().mob_blackboard.set(entity, {});
    }

    // 获取所有blackboard数据
    static getAll(entity: Entity): Record<string, any> {
        return DPUtils.store().mob_blackboard.curr(entity, {});
    }
}

// 节点工厂 - 使用工厂模式统一创建节点
export class NodeFactory {
    // 创建基础节点
    static create(name: string, executor: NodeExecutor): BehaviorNode {
        return {
            name,
            execute: (entity, children) => {
                try {
                    btTrace(`Exec: ${name}`);
                    return executor(entity, children);
                } catch (_err) {
                    // 节点执行异常时返回FAILURE，避免中断整棵树
                    btTrace(`Fail(err): ${name}`);
                    return NodeState.FAILURE;
                }
            },
            children: [],
            reset: function () {
                this.children.forEach(child => child.reset?.());
            }
        };
    }

    // 序列节点 - 使用闭包保存状态
    static sequence(name: string): BehaviorNode {
        const node = this.create(name, (entity, children = []) => {
            let currentIndex = RuntimeState.getVal<number>(entity, node, 'currentIndex', 0);

            while (currentIndex < children.length) {
                const result = children[currentIndex].execute(entity, children[currentIndex].children);

                if (result === NodeState.FAILURE) {
                    RuntimeState.setVal(entity, node, 'currentIndex', 0);
                    return NodeState.FAILURE;
                }

                if (result === NodeState.RUNNING) {
                    RuntimeState.setVal(entity, node, 'currentIndex', currentIndex);
                    return NodeState.RUNNING;
                }

                currentIndex++;
            }

            RuntimeState.setVal(entity, node, 'currentIndex', 0);
            return NodeState.SUCCESS;
        });

        node.reset = function () {
            this.children.forEach(child => child.reset?.());
        };

        return node;
    }

    // 选择器节点
    static selector(name: string): BehaviorNode {
        const node = this.create(name, (entity, children = []) => {
            let currentIndex = RuntimeState.getVal<number>(entity, node, 'currentIndex', 0);

            while (currentIndex < children.length) {
                const result = children[currentIndex].execute(entity, children[currentIndex].children);

                if (result === NodeState.SUCCESS) {
                    RuntimeState.setVal(entity, node, 'currentIndex', 0);
                    return NodeState.SUCCESS;
                }

                if (result === NodeState.RUNNING) {
                    RuntimeState.setVal(entity, node, 'currentIndex', currentIndex);
                    return NodeState.RUNNING;
                }

                currentIndex++;
            }

            RuntimeState.setVal(entity, node, 'currentIndex', 0);
            return NodeState.FAILURE;
        });

        node.reset = function () {
            this.children.forEach(child => child.reset?.());
        };

        return node;
    }

    // 并行节点
    static parallel(name: string, policy: 'all' | 'any' = 'all'): BehaviorNode {
        return this.create(name, (context, children = []) => {
            const results = children.map(child =>
                child.execute(context, child.children)
            );

            const successCount = results.filter(r => r === NodeState.SUCCESS).length;
            const failureCount = results.filter(r => r === NodeState.FAILURE).length;

            if (policy === 'all') {
                if (successCount === children.length) return NodeState.SUCCESS;
                if (failureCount > 0) return NodeState.FAILURE;
            } else { // 'any'
                if (successCount > 0) return NodeState.SUCCESS;
                if (failureCount === children.length) return NodeState.FAILURE;
            }

            return NodeState.RUNNING;
        });
    }

    // 装饰器模式 - 高阶函数
    static decorator(decoratorFn: (childResult: NodeState) => NodeState) {
        return (child: BehaviorNode): BehaviorNode => ({
            name: `Decorated(${child.name})`,
            execute: (context) => decoratorFn(child.execute(context, child.children)),
            children: [child],
            reset: () => child.reset?.()
        });
    }

    // 反转装饰器
    static inverter = this.decorator((result: NodeState) => {
        if (result === NodeState.SUCCESS) return NodeState.FAILURE;
        if (result === NodeState.FAILURE) return NodeState.SUCCESS;
        return result;
    });

    // 重复装饰器
    static repeater(maxCount = -1) {
        return (child: BehaviorNode): BehaviorNode => {
            const node: BehaviorNode = {
                name: `Repeat(${child.name})`,
                execute: (entity) => {
                    let count = RuntimeState.getVal<number>(entity, node, 'count', 0);

                    const result = child.execute(entity, child.children);

                    if (result === NodeState.RUNNING) return NodeState.RUNNING;

                    count++;
                    child.reset?.();

                    if (maxCount > 0 && count >= maxCount) {
                        RuntimeState.setVal(entity, node, 'count', 0);
                        return NodeState.SUCCESS;
                    }

                    RuntimeState.setVal(entity, node, 'count', count);
                    return NodeState.RUNNING;
                },
                children: [child],
                reset: () => {
                    child.reset?.();
                }
            };

            return node;
        };
    }

    // 叶子节点工厂方法
    static action(name: string, action: (entity: Entity) => NodeState): BehaviorNode {
        return this.create(name, action);
    }

    static condition(name: string, condition: (entity: Entity) => boolean): BehaviorNode {
        return this.create(name, (entity) =>
            condition(entity) ? NodeState.SUCCESS : NodeState.FAILURE
        );
    }

    // 基于 Minecraft tick 的等待节点 - 简化为计数器
    static wait(name: string, tickCount: number): BehaviorNode {
        const node = this.create(name, (entity) => {
            let elapsedTicks = RuntimeState.getVal<number>(entity, node, 'elapsedTicks', 0);

            elapsedTicks++;

            if (elapsedTicks >= tickCount) {
                RuntimeState.setVal(entity, node, 'elapsedTicks', 0);
                return NodeState.SUCCESS;
            }

            RuntimeState.setVal(entity, node, 'elapsedTicks', elapsedTicks);
            return NodeState.RUNNING;
        });

        node.reset = () => {
        };

        return node;
    }
}

// 建造者模式 - 流畅的API
export class BehaviorTreeBuilder {
    private nodeStack: BehaviorNode[] = [];

    // 复合节点
    sequence(name: string): this {
        return this.push(NodeFactory.sequence(name));
    }

    selector(name: string): this {
        return this.push(NodeFactory.selector(name));
    }

    parallel(name: string, policy: 'all' | 'any' = 'all'): this {
        return this.push(NodeFactory.parallel(name, policy));
    }

    // 装饰器
    inverter(): this {
        return this.decorate(NodeFactory.inverter);
    }

    repeater(maxCount = -1): this {
        return this.decorate(NodeFactory.repeater(maxCount));
    }

    // 叶子节点
    action(name: string, action: (entity: Entity) => NodeState): this {
        return this.add(NodeFactory.action(name, action));
    }

    // 批量添加动作节点
    actions(actions: Array<{ name: string; action: (entity: Entity) => NodeState }>): this {
        for (const { name, action } of actions) {
            this.action(name, action);
        }
        return this;
    }

    condition(name: string, condition: (entity: Entity) => boolean): this {
        return this.add(NodeFactory.condition(name, condition));
    }

    wait(name: string, tickCount: number): this {
        return this.add(NodeFactory.wait(name, tickCount));
    }

    // 便捷条件方法 - 使用DP系统
    check(name: string, key: string, value?: any): this {
        return this.condition(name, (entity) => {
            const val = BlackboardManager.get(entity, key);
            return value === undefined ? !!val : val === value;
        });
    }

    // 便捷动作方法
    do(name: string, action: () => void): this {
        return this.action(name, () => {
            action();
            return NodeState.SUCCESS;
        });
    }

    // 批量添加节点
    batch(nodes: BehaviorNode[]): this {
        for (const node of nodes) {
            this.add(node);
        }
        return this;
    }

    // 结构控制
    end(): this {
        if (this.nodeStack.length > 1) {
            this.nodeStack.pop();
        }
        return this;
    }

    build(): BehaviorTree {
        return new BehaviorTree(this.nodeStack[0] || NodeFactory.action('Empty', () => NodeState.SUCCESS));
    }

    // 私有辅助方法
    private push(node: BehaviorNode): this {
        this.add(node);
        this.nodeStack.push(node);
        return this;
    }

    private add(node: BehaviorNode): this {
        if (this.nodeStack.length > 0) {
            const parent = this.nodeStack[this.nodeStack.length - 1];
            const childIndex = parent.children.length;
            // 分配稳定路径，包含父路径与当前序号，避免重名冲突
            node.__path = `${parent.__path ?? parent.name}/$${node.name}#${childIndex}`;
            parent.children.push(node);
        } else {
            // 根节点路径
            node.__path = `$${node.name}#0`;
            this.nodeStack.push(node);
        }
        return this;
    }

    private decorate(decorator: (child: BehaviorNode) => BehaviorNode): this {
        if (this.nodeStack.length === 0) {
            throw new Error('No node to decorate');
        }

        const parent = this.nodeStack.length > 1 ? this.nodeStack[this.nodeStack.length - 2] : null;
        const current = this.nodeStack.pop()!;
        const decorated = decorator(current);

        if (parent) {
            const index = parent.children.indexOf(current);
            parent.children[index] = decorated;
            // 保持装饰后节点路径稳定
            decorated.__path = current.__path;
        } else {
            this.nodeStack.push(decorated);
            decorated.__path = current.__path;
        }

        return this;
    }
}

// 简化的行为树类
export class BehaviorTree {
    constructor(private root: BehaviorNode) { }

    tick(entity: Entity): NodeState {
        const result = this.root.execute(entity, this.root.children);

        if (result !== NodeState.RUNNING) {
            this.root.reset?.();
        }

        return result;
    }

    // 获取blackboard数据 - 使用DP系统
    getBlackboard(entity: Entity): Record<string, any> {
        return BlackboardManager.getAll(entity);
    }

    reset(entity: Entity): void {
        this.root.reset?.();
        BlackboardManager.clear(entity);
        RuntimeState.clearEntity(entity);
    }

    // 静态创建方法
    static create(): BehaviorTreeBuilder {
        return new BehaviorTreeBuilder();
    }
}

// 行为树管理器
export class BehaviorUtils {
    private static FACTORIES: { [key: string]: (entity: Entity) => BehaviorTree } = {};

    // 注册行为树逻辑：使用行为树ID注册工厂
    static register(treeId: string, factory: (entity: Entity) => BehaviorTree) {
        this.FACTORIES[treeId] = factory;
    }

    // 绑定实体到某个工厂键，并持久化到World动态属性
    static bind(entityId: string, factoryKey: string) {
        DPUtils.store().world_behavior_map.set(world, (curr: any = {}) => {
            const next = { ...curr };
            next[entityId] = factoryKey;
            return next;
        }, {});

    }

    private static ensureTree(entity: Entity): BehaviorTree | undefined {
        const map = DPUtils.store().world_behavior_map.curr(world, {} as Record<string, string>);
        const key = map?.[entity.id];
        if (key && this.FACTORIES[key]) {
            const tree = this.FACTORIES[key](entity);
            return tree;
        }
        return undefined;
    }

    // 一律按实体绑定：注册实体对应的行为树
    static getBlackboard(entity: Entity): Record<string, any> | undefined {
        return BlackboardManager.getAll(entity);
    }

    static tick(entity: Entity): NodeState {
        const tree = this.ensureTree(entity);
        if (!tree) return NodeState.FAILURE;

        return tree.tick(entity);
    }

    static reset(entity: Entity) {
        const tree = this.ensureTree(entity);
        if (tree) {
            tree.reset(entity);
        }
    }
}

const behaviorMapGC = ()=>{
    try {        
        // 清理无效实体映射
        const map = DPUtils.store().world_behavior_map.curr(world, {} as Record<string, string>);
        let changed = false;
        for (const id of Object.keys(map)) {
            const entityExists = !!world.getEntity(id);
            if (!entityExists) {
                delete map[id];
                changed = true;
            }
        }
        if (changed) {
            DPUtils.store().world_behavior_map.set(world, map, {});
        }
    } catch {}
}

// 定时清理与迁移：
system.runInterval(() => behaviorMapGC(), 200);

// 简化的技能配置
export interface SkillConfig {
    id: string;
    cooldown: number; // 冷却时间（tick）
    action: (entity: Entity) => NodeState;
    filter: (entity: Entity) => boolean;
    duration?: number; // 持续时间（tick），如果设置则技能执行期间不会被其他技能打断
}

export class BehaviorTemplates {
    // 预定义的actions
    private static actions = {
        // 死亡相关actions
        death: {
            check: (entity: Entity) => DPUtils.store().mob_dead.curr(entity) === true,
            execute: (deathAction: (entity: Entity) => NodeState) => (entity: Entity) => deathAction(entity)
        },

        // 目标相关actions
        target: {
            check: (entity: Entity) => DPUtils.store().mob_has_target.curr(entity) === true,
            noTargetCheck: (entity: Entity) => DPUtils.store().mob_has_target.curr(entity) !== true
        },

        // 技能相关actions
        skill: {
            checkCooldown: (skillId: string, cooldown: number) => (entity: Entity) => {
                const cooldowns = BlackboardManager.get(entity, 'skill_cooldowns', {});
                const lastUseTime = cooldowns[skillId] || 0;
                return system.currentTick - lastUseTime >= cooldown;
            },
            checkLock: (entity: Entity) => BlackboardManager.get(entity, 'skill_locking', 0) > system.currentTick,
            hasCurrent: (entity: Entity) => !!BlackboardManager.get(entity, 'current_skill'),
            execute: (skill: SkillConfig) => (entity: Entity) => {
                // 设置技能状态
                BlackboardManager.set(entity, 'current_skill', skill.id);

                // 更新冷却时间
                const cooldowns = BlackboardManager.get(entity, 'skill_cooldowns', {});
                cooldowns[skill.id] = system.currentTick;
                BlackboardManager.set(entity, 'skill_cooldowns', cooldowns);

                // 设置动画锁定
                if (skill.duration) {
                    BlackboardManager.set(entity, 'skill_locking', system.currentTick + skill.duration);
                }

                return skill.action(entity);
            },
            continueCurrent: (skills: SkillConfig[]) => (entity: Entity) => {
                const currentSkill = BlackboardManager.get(entity, 'current_skill');
                if (!currentSkill) return NodeState.FAILURE;

                const skillConfig = skills.find(s => s.id === currentSkill);
                if (!skillConfig) return NodeState.FAILURE;

                const result = skillConfig.action(entity);

                // 技能完成时清除状态
                if (result !== NodeState.RUNNING) {
                    // 技能完成时仅清除当前技能，保留锁直至超时
                    BlackboardManager.delete(entity, 'current_skill');
                }

                return result;
            }
        }
    };

    static monster(config: {
        skills?: SkillConfig[]; // 技能列表，可选
        deathAction?: (entity: Entity) => NodeState; // 死亡动作，可选
        moveToTarget?: (entity: Entity) => NodeState; // 移动行为，可选
        findTarget?: (entity: Entity) => NodeState; // 寻找目标行为，可选
        idleBehavior?: (entity: Entity) => NodeState; // 空闲行为，可选
    } = {}): BehaviorTree {
        const { actions } = this;
        const skills = config.skills ?? [];
        const deathAction = config.deathAction ?? (() => NodeState.FAILURE);
        const moveToTarget = config.moveToTarget ?? (() => NodeState.FAILURE);
        const idleBehavior = config.idleBehavior ?? (() => NodeState.FAILURE);
        const findTarget = config.findTarget ?? (() => NodeState.FAILURE);
        return BehaviorTree.create()
            .selector("MonsterMainSelector")
            .sequence("DeathHandler")
            .condition("IsDead", actions.death.check)
            .action("DeathAction", actions.death.execute(deathAction))
            .end()
            .sequence("HasTargetBehavior")
            .condition("HasTarget", actions.target.check)
            .selector("SkillSystem")
            .action("LockedGate", (entity) => {
                if (actions.skill.checkLock(entity)) {
                    const res = actions.skill.continueCurrent(skills)(entity);
                    return res === NodeState.FAILURE ? NodeState.RUNNING : res;
                }
                return NodeState.FAILURE;
            })
            .actions(skills.map(skill => ({
                name: `Skill_${skill.id}`,
                action: (entity: Entity) =>
                    !actions.skill.checkCooldown(skill.id, skill.cooldown)(entity) ? NodeState.FAILURE :
                        !skill.filter(entity) ? NodeState.FAILURE :
                            actions.skill.execute(skill)(entity)
            })))
            .end()
            .action("MoveToTarget", moveToTarget)
            .end()
            .sequence("TryFindTarget")
            .condition("NoTarget", actions.target.noTargetCheck)
            .action("FindTarget", findTarget)
            .end()
            .sequence("NoTargetBehavior")
            .condition("NoTarget", actions.target.noTargetCheck)
            .action("IdleBehavior", idleBehavior)
            .end()
            .end()
            .build();
    }

    static follow(followTarget: (entity: Entity) => Entity | null, moveAction: (entity: Entity, target: Entity) => NodeState, maxDistance: number = 5): BehaviorTree {
        return BehaviorTree.create()
            .sequence("FollowBehavior")
            .condition("HasFollowTarget", (entity) => {
                const target = followTarget(entity);
                if (!target) return false;

                const dist2 = MathUtils.distanceSquared(entity.location, target.location);
                return dist2 > maxDistance * maxDistance;
            })
            .action("MoveToTarget", (entity) => {
                const target = followTarget(entity);
                if (!target) return NodeState.FAILURE;

                return moveAction(entity, target);
            })
            .end()
            .build();
    }

    static pet(config: {
        skills?: SkillConfig[]; // 宠物技能列表
        deathAction?: (entity: Entity) => NodeState; // 死亡动作
        followTarget?: (entity: Entity) => Entity | null; // 跟随目标获取函数
        moveToTarget?: (entity: Entity, target: Entity) => NodeState; // 移动到目标行为
        moveToOwner?: (entity: Entity, owner: Entity) => NodeState; // 移动到主人行为
        findTarget?: (entity: Entity) => NodeState; // 寻找目标行为
        maxFollowDistance?: number; // 最大跟随距离
        combatRange?: number; // 战斗距离
    } = {}): BehaviorTree {
        const { actions } = this;
        const skills = config.skills ?? [];
        const deathAction = config.deathAction ?? ((entity) => {
            // 默认死亡动画：播放死亡动画并等待
            entity.triggerEvent('minecraft:death_animation');
            return NodeState.SUCCESS;
        });
        const followTarget = config.followTarget ?? ((entity) => {
            // 默认跟随最近的玩家
            return entity.dimension.getPlayers({ closest: 1, location: entity.location })[0] || null;
        });
        const moveToTarget = config.moveToTarget ?? (() => NodeState.FAILURE);
        const moveToOwner = config.moveToOwner ?? (() => NodeState.FAILURE);
        const maxFollowDistance = config.maxFollowDistance ?? 8;
        const combatRange = config.combatRange ?? 3;
        const findTarget = config.findTarget ?? (() => NodeState.FAILURE);
        return BehaviorTree.create()
            .selector("PetMainSelector")
            // 死亡处理
            .sequence("DeathHandler")
            .condition("IsDead", actions.death.check)
            .action("DeathAction", actions.death.execute(deathAction))
            .end()

            // 有目标时的战斗行为
            .sequence("CombatBehavior")
            .condition("HasTarget", actions.target.check)
            .selector("CombatSystem")
            // 锁定时仅继续当前技能，失败也保持RUNNING以短路
            .action("LockedGate", (entity) => {
                if (actions.skill.checkLock(entity)) {
                    const res = actions.skill.continueCurrent(skills)(entity);
                    return res === NodeState.FAILURE ? NodeState.RUNNING : res;
                }
                return NodeState.FAILURE;
            })

            // 尝试使用可用技能
            .sequence("UseSkills")
            .condition("InCombatRange", (entity) => {
                const targetPos = BlackboardManager.get(entity, 'target_position');
                if (!targetPos) return false;
                const dist2 = MathUtils.distanceSquared(entity.location, targetPos as Vector3);
                return dist2 <= combatRange * combatRange;
            })
            .selector("AvailableSkills")
            .actions(skills.map(skill => ({
                name: `UseSkill_${skill.id}`,
                action: (entity: Entity) => (
                    !actions.skill.checkCooldown(skill.id, skill.cooldown)(entity) ? NodeState.FAILURE :
                        !skill.filter(entity) ? NodeState.FAILURE :
                            actions.skill.execute(skill)(entity)
                )
            })))
            .end()
            .end()

            // 移动到目标
            .action("MoveToTarget", (entity) => {
                const targetPos = BlackboardManager.get(entity, 'target_position');
                if (!targetPos) return NodeState.FAILURE;

                // 创建临时目标实体用于移动
                const tempTarget = { location: targetPos } as Entity;
                return moveToTarget(entity, tempTarget);
            })

            // 检查是否所有技能都在冷却中
            .sequence("AllSkillsOnCooldown")
            .condition("AllSkillsOnCooldown", (entity) => {
                // 如果没有技能，返回true以回到跟随状态
                if (skills.length === 0) return true;

                return skills.every(skill =>
                    !actions.skill.checkCooldown(skill.id, skill.cooldown)(entity)
                );
            })
            .action("ReturnToFollow", (entity) => {
                // 清除目标状态，回到跟随模式
                DPUtils.store().mob_has_target.set(entity, false);
                BlackboardManager.delete(entity, 'target_position');
                return NodeState.SUCCESS;
            })
            .end()
            .end()
            .end()
            .sequence("TryFindTarget")
            .condition("NoTarget", actions.target.noTargetCheck)
            .action("FindTarget", findTarget)
            .end()
            // 跟随主人行为
            .sequence("FollowBehavior")
            .condition("NoTarget", actions.target.noTargetCheck)
            .selector("FollowOwner")
            .sequence("NeedToFollow")
            .condition("TooFarFromOwner", (entity) => {
                const owner = followTarget(entity);
                if (!owner) return false;

                const dist2 = MathUtils.distanceSquared(entity.location, owner.location);
                return dist2 > maxFollowDistance * maxFollowDistance;
            })
            .action("MoveToOwner", (entity) => {
                const owner = followTarget(entity);
                if (!owner) return NodeState.FAILURE;

                return moveToOwner(entity, owner);
            })
            .end()

            // 空闲状态 - 在主人附近等待
            .action("IdleNearOwner", (entity) => {
                const owner = followTarget(entity);
                if (!owner) return NodeState.FAILURE;

                // 简单的空闲行为：可以添加随机移动、坐下等动作
                return NodeState.SUCCESS;
            })
            .end()
            .end()
            .end()
            .build();
    }
}

// 合并监听不同事件的处理，不使用switch
const eventHandlers: Record<string, (entity: Entity) => void> = {
    [EntityEventIds.Timer]: (entity) => {
        BehaviorUtils.tick(entity);
    },
    [EntityEventIds.Death]: (entity) => {
        DPUtils.store().mob_dead.set(entity, true);
    },
    [EntityEventIds.TargetAcquired]: (entity) => {
        DPUtils.store().mob_has_target.set(entity, true);
    },
    [EntityEventIds.TargetEscape]: (entity) => {
        DPUtils.store().mob_has_target.set(entity, false);
        // 清理目标相关黑板，避免残留
        BlackboardManager.delete(entity, 'target_position');
        BlackboardManager.delete(entity, 'current_skill');
    }
};

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    eventHandlers[eventId]?.(entity);
});