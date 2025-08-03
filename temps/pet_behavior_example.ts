import { Entity, system } from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";
import { BehaviorTemplates, BehaviorUtils, NodeState, SkillConfig } from "../scripts/utils/behavior_utils";

// 宠物技能示例配置
const petSkills: SkillConfig[] = [
    {
        id: "fire_breath",
        cooldown: 100, // 5秒冷却 (100 ticks)
        duration: 40,  // 2秒施法时间 (40 ticks)
        action: (entity: Entity) => {
            // 喷火攻击
            entity.triggerEvent('minecraft:fire_breath_animation');

            // 这里可以添加实际的伤害逻辑
            // 例如：在前方产生火焰效果、对目标造成伤害等

            return NodeState.SUCCESS;
        }
    },
    {
        id: "lightning_strike",
        cooldown: 150, // 7.5秒冷却
        duration: 20,  // 1秒施法时间
        action: (entity: Entity) => {
            // 闪电攻击
            entity.triggerEvent('minecraft:lightning_strike_animation');

            // 可以在目标位置召唤闪电

            return NodeState.SUCCESS;
        }
    },
    {
        id: "heal",
        cooldown: 200, // 10秒冷却
        duration: 60,  // 3秒治疗时间
        action: (entity: Entity) => {
            // 治疗技能
            entity.triggerEvent('minecraft:heal_animation');

            // 恢复生命值
            const health = entity.getComponent('minecraft:health');
            if (health) {
                health.setCurrentValue(Math.min(health.currentValue + 4, health.effectiveMax));
            }

            return NodeState.SUCCESS;
        }
    }
];

// 创建宠物行为树
function createPetBehaviorTree() {
    return BehaviorTemplates.pet({
        skills: petSkills,

        // 自定义死亡动作
        deathAction: (entity: Entity) => {
            // 播放死亡动画
            entity.triggerEvent('minecraft:pet_death_animation');

            // 可以添加死亡特效、掉落物品等
            entity.dimension.spawnParticle('minecraft:death_explosion_emitter', entity.location);

            return NodeState.SUCCESS;
        },

        // 跟随目标函数 - 跟随最近的玩家
        followTarget: (entity: Entity) => {
            const players = entity.dimension.getPlayers({
                closest: 1,
                location: entity.location,
                maxDistance: 50 // 最大搜索距离50格
            });
            return players[0] || null;
        },

        // 移动到战斗目标
        moveToTarget: (entity: Entity, target: Entity) => {
            const direction = Vector3Utils.subtract(target.location, entity.location);
            const normalizedDirection = Vector3Utils.normalize(direction);
            const speed = 0.3; // 移动速度

            // 使用速度组件移动
            const velocity = entity.getComponent('minecraft:movement');
            if (velocity) {
                const moveVector = Vector3Utils.scale(normalizedDirection, speed);
                entity.applyKnockback(moveVector.x, moveVector.z, speed, 0.1);
            }

            // 检查是否到达目标附近
            const distance = Vector3Utils.distance(entity.location, target.location);
            return distance <= 3 ? NodeState.SUCCESS : NodeState.RUNNING;
        },

        // 移动到主人
        moveToOwner: (entity: Entity, owner: Entity) => {
            const direction = Vector3Utils.subtract(owner.location, entity.location);
            const normalizedDirection = Vector3Utils.normalize(direction);
            const speed = 0.4; // 跟随时稍快一些

            const velocity = entity.getComponent('minecraft:movement');
            if (velocity) {
                const moveVector = Vector3Utils.scale(normalizedDirection, speed);
                entity.applyKnockback(moveVector.x, moveVector.z, speed, 0.1);
            }

            const distance = Vector3Utils.distance(entity.location, owner.location);
            return distance <= 5 ? NodeState.SUCCESS : NodeState.RUNNING;
        },

        maxFollowDistance: 10, // 超过10格开始跟随
        combatRange: 4         // 4格内开始战斗
    });
}

// 注册宠物行为树
export function registerPetBehavior(petEntityId: string) {
    const petTree = createPetBehaviorTree();
    BehaviorUtils.register(petEntityId, petTree);
}

// 使用示例：
// registerPetBehavior('custom:fire_dragon_pet');
// registerPetBehavior('custom:lightning_wolf_pet');

/*
使用说明：

1. 宠物行为逻辑：
   - 优先级1：死亡处理 - 播放死亡动画
   - 优先级2：战斗行为 - 当有目标时
     * 继续执行当前技能（如果被技能锁定）
     * 在战斗范围内时尝试使用可用技能
     * 移动到目标
     * 当所有技能都在冷却时，自动回到跟随状态
   - 优先级3：跟随行为 - 当没有目标时
     * 距离主人太远时移动到主人身边
     * 在主人附近时进入空闲状态

2. 技能系统：
   - 每个技能有独立的冷却时间
   - 支持持续技能（duration参数控制施法时间）
   - 技能按顺序尝试，优先使用第一个可用技能

3. 状态管理：
   - 使用动态属性(DP)系统存储持久化数据
   - 使用Blackboard存储临时数据
   - 自动管理技能冷却和状态切换

4. 自定义配置：
   - 可以自定义技能列表
   - 可以自定义移动行为
   - 可以自定义跟随目标逻辑
   - 可以调整跟随距离和战斗距离
*/