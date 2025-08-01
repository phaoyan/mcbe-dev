# VecUtils 重构总结

## 重构目标
将原本混合多种职责的 `VecUtils` 类按照单一职责原则进行拆分，使职责更加专一，同时改进动态方法注入机制。

## 重构前的问题
1. **职责混杂**: `VecUtils` 类混合了几何检测、向量操作、链式操作等多种功能
2. **硬编码方法名**: 在 `initializeVecUtilsMethods` 中使用硬编码的字符串数组 `['sphere', 'cylinder', 'cone', 'cuboid', 'rect', 'sector']`
3. **维护困难**: 添加新的几何检测方法需要在多个地方手动更新

## 重构后的改进

### 1. 类职责分离

**原来的 VecUtils 类** -> **拆分为两个专门的类**:

#### GeometryUtils 类（新增）
- **职责**: 专门负责各种几何形状的点位检测
- **方法**: 
  - `sphere(point, startPoint, radius)`
  - `cylinder(point, startPoint, direction, radius, length)`
  - `cone(point, startPoint, direction, angle, length)`
  - `cuboid(point, startPoint, width, height)`
  - `rect(point, startPoint, direction, leftToRightLength, upToDownLength, backToFrontLength)`
  - `sector(point, startPoint, direction, height, angle, length)`

#### VecUtils 类（保留）
- **职责**: 专门负责向量计算和链式操作
- **方法**:
  - `unit(direction, scale)` - 向量标准化
  - `start(target, direction, dimension)` - 开始链式操作
  - `end()` - 结束链式操作并返回位置
  - `moveX/Y/Z/R/F()` - 各种移动操作
  - `moveToBlock/Entity()` - 移动到目标位置
  - `hori(vector)` - 水平化向量

### 2. 动态方法注入机制改进

**之前的实现**:
```typescript
const geometryMethods = ['sphere', 'cylinder', 'cone', 'cuboid', 'rect', 'sector']
```

**现在的实现**:
```typescript
const geometryMethods = Object.getOwnPropertyNames(GeometryUtils)
    .filter(name =>
        name !== 'length' &&
        name !== 'name' &&
        name !== 'prototype' &&
        typeof GeometryUtils[name as keyof typeof GeometryUtils] === 'function'
    )
```

### 3. 自动化和可扩展性

- **自动发现**: 新添加到 `GeometryUtils` 的方法会自动被注入到 `EntityQuery` 和 `EntityBatch`
- **零维护**: 不需要手动更新方法名列表
- **类型安全**: 保持完整的 TypeScript 类型支持

## 使用示例对比

### 重构前
```typescript
// 需要手动引用和调用 VecUtils
const entities = EntityQuery.entities(player)
    .filter(e => VecUtils.sphere(e.location, player.location, 10))
    .filter(e => VecUtils.cone(e.location, player.location, player.getViewDirection(), Math.PI/3, 15))
    .get()
```

### 重构后
```typescript
// 直接链式调用，更直观
const entities = EntityQuery.entities(player)
    .sphere(player.location, 10)
    .cone(player.location, player.getViewDirection(), Math.PI/3, 15)
    .get()
```

## 文件变更总结

### scripts/utils/vec_utils.ts
- ✅ 新增 `GeometryUtils` 类，包含所有几何检测方法
- ✅ 保留 `VecUtils` 类，专注于向量操作和链式操作

### scripts/utils/entity_utils.ts
- ✅ 引入 `GeometryUtils` 类
- ✅ 将 `initializeVecUtilsMethods` 改名为 `initializeGeometryMethods`
- ✅ 使用动态方法发现替代硬编码方法名数组
- ✅ 更新所有相关注释和类型声明

### temps/entity_query_geometry_example.ts
- ✅ 更新示例代码使用 `GeometryUtils`
- ✅ 保持所有功能示例的正确性

## 收益总结

1. **更清晰的职责划分**: 每个类都有明确的单一职责
2. **更好的可维护性**: 添加新几何检测方法只需在 `GeometryUtils` 中实现
3. **自动化程度更高**: 无需手动维护方法名列表
4. **保持向后兼容**: 现有的链式调用 API 完全不变
5. **更好的类型安全**: 完整的 TypeScript 类型支持