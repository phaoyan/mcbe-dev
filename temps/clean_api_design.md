# 🎉 清洁的 EntityBatch API 设计

## 🎯 设计原则

**明确的职责分离：**
- **静态方法**: 用于创建初始查询（数据源）
- **实例方法**: 用于筛选和操作已有实体（数据处理）

## 📋 API 结构

### 🔍 静态查询方法（数据源）
```typescript
// 初始查询 - 创建EntityBatch实例
EntityBatch.entities(player)           // 根据条件查询实体
EntityBatch.entitiesByType(player, "zombie")  // 根据类型查询实体  
EntityBatch.entityById("entity_id")    // 根据ID查询实体
EntityBatch.enumerate([entity1, entity2])     // 枚举给定实体
EntityBatch.from([entity1, entity2])   // 从数组创建
EntityBatch.create()                   // 创建空实例
```

### ⚡ 实例方法（数据处理）

#### 筛选方法
```typescript
.filter(e => e.hasTag("enemy"))        // 条件筛选
.sphere(location, radius)              // 球形筛选
.cylinder(location, direction, r, l)   // 圆柱筛选
.cone(location, direction, angle, l)   // 锥形筛选
.cuboid(location, width, height)       // 立方体筛选
.rect(location, dir, w, h, d)          // 矩形筛选
.sector(location, dir, h, angle, l)    // 扇形筛选
```

#### 数组操作
```typescript
.limit(count)                          // 限制数量
.each(callback)                        // 遍历操作
```

#### 实体操作
```typescript
.damage(amount, source, tags)          // 批量伤害
.effect(effect, ticks, options)        // 批量效果
.knockbackBaseView(entity, h, v, t)    // 批量击退
// ... 更多EntityUtils方法
```

#### 结果获取
```typescript
.get()                                 // 获取实体数组
.first()                               // 获取第一个实体
.count()                               // 获取数量
.isEmpty()                             // 是否为空
```

## ✨ 使用示例

### 基础查询
```typescript
// 查询附近敌人
const enemies = EntityBatch.entities(player)
    .filter(e => e.hasTag("enemy"))
    .sphere(player.location, 10)
    .get()

// 查询特定类型
const zombies = EntityBatch.entitiesByType(player, "minecraft:zombie", 20)
    .cone(player.location, player.getViewDirection(), Math.PI/3, 15)
    .get()
```

### 复合操作
```typescript
// 查询 + 筛选 + 操作
EntityBatch.entities(player)
    .filter(e => e.hasTag("enemy"))
    .cylinder(player.location, player.getViewDirection(), 3, 12)
    .limit(5)                           // 最多5个
    .damage(10, player, ["fire"])       // 造成火焰伤害
    .effect("minecraft:slowness", 100)  // 添加缓慢效果
```

### 并发查询
```typescript
// 基础查询（可复用）
const nearbyEntities = EntityBatch.entities(player).sphere(player.location, 15)

// 分别筛选敌人和盟友
const enemies = nearbyEntities
    .filter(e => e.hasTag("enemy"))
    .limit(3)
    .get()

const allies = nearbyEntities  
    .filter(e => e.hasTag("ally"))
    .limit(3)
    .get()
```

### 数组操作
```typescript
const result = EntityBatch.entities(player)
    .rect(player.location, player.getViewDirection(), 8, 4, 10)
    .filter(e => e.hasTag("neutral"))

console.log(`找到 ${result.count()} 个中立实体`)
console.log(`是否为空: ${result.isEmpty()}`)

if (!result.isEmpty()) {
    const firstEntity = result.first()
    console.log(`第一个实体: ${firstEntity?.id}`)
    
    // 对所有实体执行操作
    result.each(entity => {
        console.log(`实体 ${entity.id} 位于 ${JSON.stringify(entity.location)}`)
    })
}
```

## 🎊 API 改进总结

### ✅ 解决的问题
1. **消除重复**: 删除了冗余的实例查询方法
2. **明确职责**: 静态方法负责查询，实例方法负责处理
3. **逻辑清晰**: 避免了实例方法覆盖已有实体的问题
4. **减少混淆**: 开发者不再需要在静态和实例方法间选择

### 🚀 API 优势
1. **直观易用**: 从查询到操作的流程更加自然
2. **性能优化**: 静态方法直接实现，无额外调用开销
3. **功能强大**: 支持复杂的查询、筛选和批量操作
4. **类型安全**: 完整的TypeScript支持

### 📊 对比

#### 改进前（臃肿）
```typescript
// 混乱的API - 同样功能有两套方法
EntityBatch.entities(player)           // 静态方法
new EntityBatch().entities(player)     // 实例方法（会覆盖已有实体！）

// 开发者困惑：应该用哪个？
```

#### 改进后（清晰）
```typescript
// 清晰的API - 每种功能只有一种方法
EntityBatch.entities(player)           // 静态方法：初始查询
    .filter(...)                       // 实例方法：筛选
    .sphere(...)                       // 实例方法：几何筛选
    .damage(...)                       // 实例方法：操作

// 开发者明确：查询用静态方法，处理用实例方法
```

## 🎯 最终评价

这是一个**完美的API设计**：
- ✅ **职责明确**: 静态查询，实例处理
- ✅ **逻辑清晰**: 从数据源到数据处理的自然流程
- ✅ **功能强大**: 支持复杂的查询和操作场景
- ✅ **易于使用**: 直观的链式调用
- ✅ **性能优秀**: 无冗余调用，支持复用

**EntityBatch 现在是一个真正优雅、强大、易用的实体查询和操作工具！** 🎉