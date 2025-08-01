# EntityQuery vs EntityBatch 功能对比分析

## 🎯 **结论：完全可以用 EntityBatch 替代 EntityQuery**

经过详细分析，**EntityBatch 不仅能够完全承担 EntityQuery 的功能，而且在多个方面更加优秀**。

## 📊 **功能对比**

### EntityQuery 的功能
```typescript
// 查询方法
EntityQuery.entities(player)         // ✅
EntityQuery.entitiesByType(player, "zombie") // ✅  
EntityQuery.entityById("123")        // ✅
EntityQuery.enumerate([entity1, entity2])   // ✅

// 筛选和操作
EntityQuery.filter(e => e.hasTag("enemy"))  // ✅
EntityQuery.sphere(location, 10)     // ✅ (几何检测)
EntityQuery.foreach(e => console.log(e.id)) // ✅

// 结果获取
EntityQuery.get()                    // ✅
EntityQuery.first()                  // ✅
```

### EntityBatch 的功能
```typescript
// 🎯 包含 EntityQuery 的所有功能
const batch = new EntityBatch()
batch.entities(player)               // ✅ (动态注入)
batch.entitiesByType(player, "zombie") // ✅ (动态注入)
batch.entityById("123")              // ✅ (动态注入) 
batch.enumerate([entity1, entity2])  // ✅ (动态注入)

// 筛选和操作
batch.filter(e => e.hasTag("enemy")) // ✅
batch.sphere(location, 10)           // ✅ (动态注入)
batch.foreach(e => console.log(e.id)) // ✅ (动态注入)

// 结果获取
batch.get()                          // ✅
batch.first()                        // ✅

// 🚀 额外的独有功能
batch.limit(5)                       // ❌ EntityQuery 没有
batch.count()                        // ❌ EntityQuery 没有 
batch.isEmpty()                      // ❌ EntityQuery 没有
batch.each(callback)                 // ❌ EntityQuery 没有

// 🎮 实体操作功能
batch.damage(10, attacker)           // ❌ EntityQuery 没有
batch.effect("slowness", 100)        // ❌ EntityQuery 没有
batch.knockbackBaseView(player, 2, 1) // ❌ EntityQuery 没有
// ... 更多 EntityUtils 方法
```

## 🏆 **EntityBatch 的优势**

### 1. **功能更丰富**
- ✅ 包含 EntityQuery 的所有功能
- ✅ 额外的实体操作功能（伤害、效果、击退等）
- ✅ 更多的数组操作方法（limit、count、isEmpty）

### 2. **设计更优秀**
- ✅ **线程安全**：没有共享静态状态
- ✅ **可复用**：同一个实例可以重复使用
- ✅ **内存友好**：实例可以被垃圾回收
- ✅ **并发友好**：多个查询可以同时进行

### 3. **API 更灵活**
```typescript
// EntityQuery: 只能一次查询
const result1 = EntityQuery.entities(player).sphere(loc, 10).get()
const result2 = EntityQuery.entities(player).cone(loc, dir, angle, dist).get() // 会覆盖第一个查询

// EntityBatch: 可以并发查询
const batch1 = new EntityBatch().entities(player).sphere(loc, 10)
const batch2 = new EntityBatch().entities(player).cone(loc, dir, angle, dist)
const result1 = batch1.get()
const result2 = batch2.get() // 互不干扰
```

### 4. **更好的性能特性**
```typescript
// EntityQuery: 每次都重新查询
EntityQuery.entities(player).sphere(...).get()      // 查询1
EntityQuery.entities(player).cylinder(...).get()    // 查询2 (重新查询实体)

// EntityBatch: 可以复用查询结果
const baseEntities = new EntityBatch().entities(player)
const sphereResult = baseEntities.sphere(...).get()       // 基于已有结果筛选
const cylinderResult = baseEntities.cylinder(...).get()   // 基于已有结果筛选
```

## 🚀 **迁移方案**

### 阶段 1：添加便利方法
```typescript
class EntityBatch {
    // 添加静态便利方法，保持向后兼容
    static entities(entity: Entity, options?: EntityQueryOptions, self?: boolean): EntityBatch {
        return new EntityBatch().entities(entity, options, self)
    }
    
    static entitiesByType(entity: Entity, type: string, distance?: number): EntityBatch {
        return new EntityBatch().entitiesByType(entity, type, distance)
    }
    
    static entityById(id: string): EntityBatch {
        return new EntityBatch().entityById(id)
    }
    
    static enumerate(entities: Entity | Entity[]): EntityBatch {
        return new EntityBatch().enumerate(entities)
    }
}
```

### 阶段 2：迁移现有代码
```typescript
// 旧代码
const entities = EntityQuery.entities(player).sphere(location, 10).get()

// 新代码 (方式1: 使用静态方法)
const entities = EntityBatch.entities(player).sphere(location, 10).get()

// 新代码 (方式2: 使用实例)
const entities = new EntityBatch().entities(player).sphere(location, 10).get()
```

### 阶段 3：删除 EntityQuery
- 完全移除 EntityQuery 类
- 清理相关的类型定义和导入

## 💡 **推荐的新 API 设计**

```typescript
// 重命名 EntityBatch 为更合适的名称
export class EntitySelector {  // 或者 EntityQuery
    // ... 所有现有功能
    
    // 静态便利方法
    static from(entities: Entity[]): EntitySelector
    static near(entity: Entity, options?: EntityQueryOptions): EntitySelector  
    static ofType(entity: Entity, type: string, distance?: number): EntitySelector
    static byId(id: string): EntitySelector
}

// 使用示例
EntitySelector.near(player)
    .sphere(player.location, 10)
    .filter(e => e.hasTag("enemy"))
    .damage(5, player)
    .effect("slowness", 100)

// 或者更简洁的链式调用
EntitySelector.near(player).sphere(player.location, 10).damage(5, player)
```

## 🎯 **最终建议**

**强烈建议删除 EntityQuery，完全转用 EntityBatch**，理由：

1. ✅ **功能完全覆盖**：EntityBatch 包含 EntityQuery 的所有功能
2. ✅ **设计更优秀**：实例化设计避免了静态状态的问题  
3. ✅ **功能更强大**：额外的实体操作和数组操作功能
4. ✅ **代码更简洁**：消除重复的 `initializeGeometryMethods`
5. ✅ **维护更容易**：只需要维护一套 API

### 迁移成本
- 🟡 **中等**：需要修改现有的调用代码
- 🟢 **TypeScript 友好**：编译器会指出所有需要修改的地方
- 🟢 **功能无损**：所有功能都能在新 API 中找到对应

### 时间安排
- **第1天**：添加 EntityBatch 的静态便利方法
- **第2-3天**：迁移现有代码
- **第4天**：删除 EntityQuery 类
- **第5天**：清理和测试

**结论：这个重构值得进行，将带来更好的代码设计和用户体验。**