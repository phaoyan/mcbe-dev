import { Entity, world, system } from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";
import { DPUtils } from "./dp_utils";
import { EntityEventIds } from "../lists/event_list";

// 行为树框架
export enum NodeState {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    RUNNING = 'RUNNING'
}

// 节点执行函数类型
export type NodeExecutor = (entity: Entity, children?: BehaviorNode[]) => NodeState;

// 统一的节点接口
export interface BehaviorNode {
    name: string;
    execute: NodeExecutor;
    children: BehaviorNode[];
    reset?: () => void;
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
            execute: executor,
            children: [],
            reset: function () {
                this.children.forEach(child => child.reset?.());
            }
        };
    }

    // 序列节点 - 使用闭包保存状态
    static sequence(name: string): BehaviorNode {
        let currentIndex = 0;

        const node = this.create(name, (context, children = []) => {
            while (currentIndex < children.length) {
                const result = children[currentIndex].execute(context, children[currentIndex].children);

                if (result === NodeState.FAILURE) {
                    currentIndex = 0;
                    return NodeState.FAILURE;
                }

                if (result === NodeState.RUNNING) return NodeState.RUNNING;

                currentIndex++;
            }

            currentIndex = 0;
            return NodeState.SUCCESS;
        });

        node.reset = function () {
            currentIndex = 0;
            this.children.forEach(child => child.reset?.());
        };

        return node;
    }

    // 选择器节点
    static selector(name: string): BehaviorNode {
        let currentIndex = 0;

        const node = this.create(name, (context, children = []) => {
            while (currentIndex < children.length) {
                const result = children[currentIndex].execute(context, children[currentIndex].children);

                if (result === NodeState.SUCCESS) {
                    currentIndex = 0;
                    return NodeState.SUCCESS;
                }

                if (result === NodeState.RUNNING) return NodeState.RUNNING;

                currentIndex++;
            }

            currentIndex = 0;
            return NodeState.FAILURE;
        });

        node.reset = function () {
            currentIndex = 0;
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
        let count = 0;

        return (child: BehaviorNode): BehaviorNode => {
            const node: BehaviorNode = {
                name: `Repeat(${child.name})`,
                execute: (context) => {
                    const result = child.execute(context, child.children);

                    if (result === NodeState.RUNNING) return NodeState.RUNNING;

                    count++;
                    child.reset?.();

                    if (maxCount > 0 && count >= maxCount) {
                        count = 0;
                        return NodeState.SUCCESS;
                    }

                    return NodeState.RUNNING;
                },
                children: [child],
                reset: () => {
                    count = 0;
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
        let elapsedTicks = 0;

        const node = this.create(name, (entity) => {
            elapsedTicks++;

            if (elapsedTicks >= tickCount) {
                elapsedTicks = 0;
                return NodeState.SUCCESS;
            }

            return NodeState.RUNNING;
        });

        node.reset = () => {
            elapsedTicks = 0;
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
            parent.children.push(node);
        } else {
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
        } else {
            this.nodeStack.push(decorated);
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
    }

    // 静态创建方法
    static create(): BehaviorTreeBuilder {
        return new BehaviorTreeBuilder();
    }
}

// 行为树管理器
export class BehaviorUtils {
    private static BEHAVIOR_TREES: { [entityId: string]: BehaviorTree } = {};

    static register(entityId: string, tree: BehaviorTree) {
        this.BEHAVIOR_TREES[entityId] = tree;
    }

    static getTree(entityId: string): BehaviorTree | undefined {
        return this.BEHAVIOR_TREES[entityId];
    }

    static getBlackboard(entity: Entity): Record<string, any> | undefined {
        return BlackboardManager.getAll(entity);
    }

    static tick(entity: Entity): NodeState {
        const tree = this.getTree(entity.typeId);
        if (!tree) return NodeState.FAILURE;

        return tree.tick(entity);
    }

    static reset(entity: Entity) {
        const tree = this.getTree(entity.typeId);
        if (tree) {
            tree.reset(entity);
        }
    }
}

// 简化的技能配置
export interface SkillConfig {
    id: string;
    cooldown: number; // 冷却时间（tick）
    action: (entity: Entity) => NodeState;
    duration?: number; // 持续时间（tick），如果设置则技能执行期间不会被其他技能打断
}

// 简化的怪物AI配置
export interface MonsterAIConfig {
    skills?: SkillConfig[]; // 技能列表，可选
    deathAction?: (entity: Entity) => NodeState; // 死亡动作，可选
    moveToTarget?: (entity: Entity) => NodeState; // 移动行为，可选
    idleBehavior?: (entity: Entity) => NodeState; // 空闲行为，可选
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
                    BlackboardManager.delete(entity, 'skill_locking');
                    BlackboardManager.delete(entity, 'current_skill');
                }

                return result;
            }
        }
    };

    static monster(config: MonsterAIConfig = {}): BehaviorTree {
        const { actions } = this;
        const skills = config.skills ?? [];
        const deathAction = config.deathAction ?? (() => NodeState.FAILURE);
        const moveToTarget = config.moveToTarget ?? (() => NodeState.FAILURE);
        const idleBehavior = config.idleBehavior ?? (() => NodeState.FAILURE);

        return BehaviorTree.create()
            .selector("MonsterMainSelector")
                .sequence("DeathHandler")
                    .condition("IsDead", actions.death.check)
                    .action("DeathAction", actions.death.execute(deathAction))
                    .end()
                .sequence("HasTargetBehavior")
                    .condition("HasTarget", actions.target.check)
                    .selector("SkillSystem")
                        .sequence("CheckSkillLock")
                            .condition("IsSkillLocked", actions.skill.checkLock)
                            .action("ContinueCurrentSkill", actions.skill.continueCurrent(skills))
                            .end()
                        .actions(skills.map(skill => ({
                            name: `Skill_${skill.id}`,
                            action: (entity: Entity) => 
                                !actions.skill.checkCooldown(skill.id, skill.cooldown)(entity) ? 
                                NodeState.FAILURE : 
                                actions.skill.execute(skill)(entity)
                        })))
                        .end()
                    .action("MoveToTarget", moveToTarget)
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

                    const distance = Vector3Utils.distance(entity.location, target.location);
                    return distance > maxDistance;
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
                        // 继续执行当前技能
                        .sequence("ContinueSkill")
                            .condition("IsSkillLocked", actions.skill.checkLock)
                            .action("ContinueCurrentSkill", actions.skill.continueCurrent(skills))
                            .end()
                        
                        // 尝试使用可用技能
                        .sequence("UseSkills")
                            .condition("InCombatRange", (entity) => {
                                const targetPos = BlackboardManager.get(entity, 'target_position');
                                if (!targetPos) return false;
                                const distance = Vector3Utils.distance(entity.location, targetPos);
                                return distance <= combatRange;
                            })
                            .selector("AvailableSkills")
                                .actions(skills.map(skill => ({
                                    name: `UseSkill_${skill.id}`,
                                    action: (entity: Entity) => {
                                        // 检查技能是否可用
                                        if (!actions.skill.checkCooldown(skill.id, skill.cooldown)(entity)) {
                                            return NodeState.FAILURE;
                                        }
                                        return actions.skill.execute(skill)(entity);
                                    }
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
                
                // 跟随主人行为
                .sequence("FollowBehavior")
                    .condition("NoTarget", actions.target.noTargetCheck)
                    .selector("FollowOwner")
                        .sequence("NeedToFollow")
                            .condition("TooFarFromOwner", (entity) => {
                                const owner = followTarget(entity);
                                if (!owner) return false;
                                
                                const distance = Vector3Utils.distance(entity.location, owner.location);
                                return distance > maxFollowDistance;
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
    }
};

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    eventHandlers[eventId]?.(entity);
});