/**
 * 实际迁移方案：EntityQuery -> EntityBatch
 * 
 * 这是一个实用的、分阶段的迁移计划
 */

import { Entity, EntityQueryOptions, Vector3 } from "@minecraft/server";

// ==================== 阶段 1：在现有 EntityBatch 中添加静态方法 ====================

// 在 entity_utils.ts 中的 EntityBatch 类中添加以下静态方法：

/*
export class EntityBatch {
    // ... 现有代码 ...

    // 新增：静态便利方法，提供与 EntityQuery 相同的 API
    static entities(entity: Entity, options?: EntityQueryOptions, self?: boolean): EntityBatch {
        return new EntityBatch().entities(entity, options, self)
    }

    static entitiesByType(entity: Entity, type: string, distance: number = 128): EntityBatch {
        return new EntityBatch().entitiesByType(entity, type, distance)
    }

    static entityById(id: string): EntityBatch {
        return new EntityBatch().entityById(id)
    }

    static enumerate(entities: Entity | Entity[]): EntityBatch {
        return new EntityBatch().enumerate(entities)
    }

    // 额外的便利方法
    static from(entities: Entity[]): EntityBatch {
        return new EntityBatch(entities)
    }

    static empty(): EntityBatch {
        return new EntityBatch([])
    }
}
*/

// ==================== 阶段 2：更新导出，保持向后兼容 ====================

// 在 entity_utils.ts 文件末尾添加：
/*
// 向后兼容：将 EntityBatch 也导出为 EntityQuery
export const EntityQuery = EntityBatch;
export type EntityQuery = EntityBatch;
*/

// ==================== 阶段 3：迁移现有代码 ====================

export class MigrationExamples {
    static demonstrateMigration(player: Entity) {
        const location = player.location
        const direction = player.getViewDirection()

        // ==================== 简单替换 ====================

        // 旧代码
        // const entities1 = EntityQuery.entities(player).get()

        // 新代码（无需修改，因为 EntityQuery = EntityBatch）
        // const entities1 = EntityQuery.entities(player).get()

        // 或者直接使用 EntityBatch
        const entities1 = EntityBatch.entities(player).get()

        // ==================== 利用新功能改进 ====================

        // 之前：多次查询，性能较差
        /*
        const nearbyEnemies = EntityQuery.entities(player)
            .filter(e => e.hasTag("enemy"))
            .sphere(location, 10)
            .get()
            
        const nearbyAllies = EntityQuery.entities(player)  // 重复查询！
            .filter(e => e.hasTag("ally"))
            .sphere(location, 10)
            .get()
        */

        // 现在：复用基础查询，性能更好
        const nearbyEntities = EntityBatch.entities(player).sphere(location, 10)
        const nearbyEnemies = nearbyEntities.filter(e => e.hasTag("enemy")).get()
        const nearbyAllies = nearbyEntities.filter(e => e.hasTag("ally")).get()

        // ==================== 新的能力：查询 + 操作 ====================

        // 之前：需要分别查询和操作
        /*
        const targets = EntityQuery.entities(player)
            .filter(e => e.hasTag("enemy"))
            .sphere(location, 8)
            .get()
            
        targets.forEach(entity => {
            EntityUtils.entity(entity)
                .damage(5, player, ["fire"])
                .effect("minecraft:slowness", 100)
        })
        */

        // 现在：一次完成
        EntityBatch.entities(player)
            .filter(e => e.hasTag("enemy"))
            .sphere(location, 8)
            .damage(5, player, ["fire"])
            .effect("minecraft:slowness", 100)

        // ==================== 新的能力：更丰富的数组操作 ====================

        const result = EntityBatch.entities(player)
            .cylinder(location, direction, 3, 12)
            .filter(e => e.hasTag("neutral"))
            .limit(5)  // 最多5个

        console.log(`找到 ${result.count()} 个中立实体`)

        if (!result.isEmpty()) {
            const firstEntity = result.first()
            console.log(`第一个实体ID: ${firstEntity?.id}`)
        }
    }

    // ==================== 重构指南 ====================

    static refactoringPatterns() {
        // 模式1：简单查询
        // 旧: EntityQuery.entities(player).sphere(...).get()
        // 新: EntityBatch.entities(player).sphere(...).get()

        // 模式2：复用查询
        // 旧: 重复调用 EntityQuery.entities(player)
        // 新: 创建一个基础查询，然后复用

        // 模式3：查询后操作
        // 旧: 查询 -> 遍历 -> 单独操作每个实体
        // 新: 查询 -> 批量操作

        // 模式4：数组操作
        // 旧: 手动检查数组长度、获取第一个等
        // 新: 使用 count()、isEmpty()、first()、limit()
    }
}

// ==================== 阶段 4：清理阶段（在所有代码迁移完成后） ====================

export class CleanupPhase {
    // 1. 删除原始的 EntityQuery 类定义
    // 2. 移除 EntityQuery 的 static 导出别名
    // 3. 可选：将 EntityBatch 重命名为 EntityQuery（如果喜欢这个名字）
    // 4. 更新所有导入语句
    // 5. 运行测试确保一切正常工作

    static cleanupChecklist() {
        return [
            "✅ 所有 EntityQuery.xxx() 调用已替换为 EntityBatch.xxx()",
            "✅ 利用了新功能改进了性能和代码质量",
            "✅ 添加了单元测试验证功能正确性",
            "⏳ 删除原始 EntityQuery 类",
            "⏳ 清理导入和类型定义",
            "⏳ 运行完整测试套件",
            "⏳ 更新文档和示例代码"
        ]
    }
}

// ==================== 迁移的好处总结 ====================

/**
 * 🎯 迁移收益总结：
 * 
 * 1. **性能优化**
 *    - 消除重复的实体查询
 *    - 可以复用查询结果
 *    - 减少内存分配（静态 -> 实例）
 * 
 * 2. **功能增强**
 *    - 查询 + 操作一体化
 *    - 更丰富的数组操作方法
 *    - 支持并发查询
 * 
 * 3. **代码质量**
 *    - 消除静态状态的问题
 *    - 更好的封装和模块化
 *    - 单一代码路径，易于维护
 * 
 * 4. **开发体验**
 *    - 更直观的 API
 *    - 更好的 TypeScript 支持
 *    - 链式调用更流畅
 * 
 * 5. **向后兼容**
 *    - 平滑迁移，无破坏性更改
 *    - 现有代码可以逐步更新
 *    - 保持 API 一致性
 */

export { MigrationExamples, CleanupPhase }