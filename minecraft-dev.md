# Minecraft Dev 脚本框架用户手册（面向大模型调用）

本文档基于 [scripts/](scripts) 目录下的 TypeScript 源码，归纳脚本框架的职责、API 与典型用法，便于“之后由大模型阅读理解与调用”。文中所有出现的“文件名/路径”均为可点击链接；所有“语言构造（函数/类/常量/枚举/类型等）”均附带精确行号的可点击交叉引用。

目录结构参考：
- 入口模块：[scripts/main.ts](scripts/main.ts)
- 初始化模块：[scripts/init.ts](scripts/init.ts)
- 调试模块：[scripts/debug.ts](scripts/debug.ts)
- 列表/数据字典：[scripts/lists/](scripts/lists)
- 工具集：[scripts/utils/](scripts/utils)
- JSON 清单（示例用途）：[scripts/json/](scripts/json)

运行时依赖：
- @minecraft/server
- @minecraft/vanilla-data
- @minecraft/server-ui（UI 工具）
- @minecraft/math（向量工具）


----------------------------------------
1. 框架概览
----------------------------------------

入口与加载顺序
- 入口文件 [scripts/main.ts](scripts/main.ts) 以模块汇入的方式加载各层功能，包括 lists 数据字典、utils 工具集、基础初始化和调试模块。
  - 数据字典与事件 ID：
    - [scripts/lists/damage_list.ts](scripts/lists/damage_list.ts)
    - [scripts/lists/dp_list.ts](scripts/lists/dp_list.ts)
    - [scripts/lists/dp_mapping.ts](scripts/lists/dp_mapping.ts)
    - [scripts/lists/event_list.ts](scripts/lists/event_list.ts)
    - [scripts/lists/tag_list.ts](scripts/lists/tag_list.ts)
  - 工具集：
    - [scripts/utils/anim_utils.ts](scripts/utils/anim_utils.ts)
    - [scripts/utils/behavior_utils.ts](scripts/utils/behavior_utils.ts)
    - [scripts/utils/click_utils.ts](scripts/utils/click_utils.ts)
    - [scripts/utils/comp_utils.ts](scripts/utils/comp_utils.ts)
    - [scripts/utils/damage_utils.ts](scripts/utils/damage_utils.ts)
    - [scripts/utils/dp_utils.ts](scripts/utils/dp_utils.ts)
    - [scripts/utils/effect_utils.ts](scripts/utils/effect_utils.ts)
    - [scripts/utils/entity_utils.ts](scripts/utils/entity_utils.ts)
    - [scripts/utils/inventory_utils.ts](scripts/utils/inventory_utils.ts)
    - [scripts/utils/item_utils.ts](scripts/utils/item_utils.ts)
    - [scripts/utils/math_utils.ts](scripts/utils/math_utils.ts)
    - [scripts/utils/time_utils.ts](scripts/utils/time_utils.ts)
    - [scripts/utils/ui_utils.ts](scripts/utils/ui_utils.ts)
    - [scripts/utils/voidbind_utils.ts](scripts/utils/voidbind_utils.ts)
  - 初始化（worldLoad 设置）：[scripts/init.ts](scripts/init.ts)
  - 调试（ScriptEvent 监听与示例）：[scripts/debug.ts](scripts/debug.ts)

运行时依赖
- 游戏 API：@minecraft/server、@minecraft/vanilla-data、@minecraft/server-ui、@minecraft/math
- 通过事件总线 world/system.afterEvents、ScriptEvent 等进行交互


----------------------------------------
2. 快速上手
----------------------------------------

2.1 最小可运行示例：worldLoad 初始化

初始化发生于 [world.afterEvents.worldLoad.subscribe](scripts/init.ts:4)，示例内将关闭 gamerule showtags：
- 调用位置：[world.afterEvents.worldLoad.subscribe](scripts/init.ts:4)
- 具体命令执行：[world.getDimension(MinecraftDimensionTypes.Overworld).runCommand](scripts/init.ts:5)

最小片段（可直接粘贴到自定义 init 模块，框架已内置同等逻辑）：
```ts
import { world } from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";

world.afterEvents.worldLoad.subscribe(() => {
  world.getDimension(MinecraftDimensionTypes.Overworld).runCommand("gamerule showtags false");
});
```

2.2 发送 Script Event 与期望效果

事件 ID 列表定义于 [ScriptEventIds](scripts/lists/event_list.ts:16)。调试召唤示例在 [system.afterEvents.scriptEventReceive.subscribe](scripts/debug.ts:10) 中监听，当收到 [ScriptEventIds.DebugSummon](scripts/lists/event_list.ts:16) 时，在玩家周围生成 30 个铁傀儡。

- 在游戏中执行：`/scriptevent debug:summon`
- 生成逻辑关键调用：
  - 事件分发监听：[system.afterEvents.scriptEventReceive.subscribe](scripts/debug.ts:10)
  - 事件 ID 判断：[ScriptEventIds.DebugSummon](scripts/lists/event_list.ts:16)
  - 位置计算使用 [VecUtils.start()](scripts/utils/math_utils.ts:204)、[VecUtils.moveF()](scripts/utils/math_utils.ts:245)、[VecUtils.moveR()](scripts/utils/math_utils.ts:239)
  - 召唤实体：`dimension.spawnEntity(...)`（调用出现在 [scripts/debug.ts](scripts/debug.ts) 第 15 行）


----------------------------------------
3. 事件与调试
----------------------------------------

3.1 worldLoad 事件回调与常见初始化操作
- 框架在 [scripts/init.ts](scripts/init.ts) 中通过 [world.afterEvents.worldLoad.subscribe](scripts/init.ts:4) 完成初始 gamerule 设置。
- 你也可在 [scripts/debug.ts](scripts/debug.ts) 的 [world.afterEvents.worldLoad.subscribe](scripts/debug.ts:6) 中放置调试版本提示或更多初始化日志输出。

3.2 ScriptEvent 调试案例
- 监听： [system.afterEvents.scriptEventReceive.subscribe](scripts/debug.ts:10)
- 触发命令：`/scriptevent debug:summon`
- 效果：使用 [VecUtils](scripts/utils/math_utils.ts:189) 计算相对玩家的随机位置，并在这些位置批量 [spawnEntity](scripts/debug.ts:15) 铁傀儡。
- 位置计算链式 API： [VecUtils.start()](scripts/utils/math_utils.ts:204) → [VecUtils.moveF()](scripts/utils/math_utils.ts:245) → [VecUtils.moveR()](scripts/utils/math_utils.ts:239) → [VecUtils.end()](scripts/utils/math_utils.ts:220)


----------------------------------------
4. 数据字典与映射
----------------------------------------

4.1 列表职责
- 事件常量：[EntityEventIds](scripts/lists/event_list.ts:1)、[ScriptEventIds](scripts/lists/event_list.ts:16)
- 伤害标签与倍率表占位：
  - [DamageTags](scripts/lists/damage_list.ts:1)
  - [DamageRateList](scripts/lists/damage_list.ts:5)（当前为空表，供扩展）
- 动态属性键定义：[dpList](scripts/lists/dp_list.ts:1)
- 标签工具：
  - [TagList](scripts/lists/tag_list.ts:3)

4.2 JSON 清单（示例用途）
- 动画 ID：[scripts/json/animation_ids.json](scripts/json/animation_ids.json)
- 动画时长：[scripts/json/animation_length.json](scripts/json/animation_length.json)
- 实体 ID：[scripts/json/entity_ids.json](scripts/json/entity_ids.json)
- 物品 ID：[scripts/json/item_ids.json](scripts/json/item_ids.json)
- 粒子 ID（占位）：[scripts/json/particle_ids.json](scripts/json/particle_ids.json)

常见引用方式：在动画工具中读取动画标识（见 [anim_utils.ts](scripts/utils/anim_utils.ts) 顶部的 import），并通过 [AnimUtils.register()](scripts/utils/anim_utils.ts:59) 或绑定器 [AnimUtils.animbinds()](scripts/utils/anim_utils.ts:84) 动态控制 AC。


----------------------------------------
5. 工具函数总览与示例
----------------------------------------

说明约定：
- 用途：说明模块核心职责
- 核心函数：以“语言构造可点击链接(带行号)”列出
- 示例：给出 2 个常见任务片段（10~25 行），片段上下文文字中附上 API 链接

5.1 动画工具 anim_utils
- 文件：[scripts/utils/anim_utils.ts](scripts/utils/anim_utils.ts)
- 用途：为实体（主要是玩家）注册/卸载动画控制器（AC），并通过 DP 状态变化实现 AC 的自动切换。
- 核心函数与常量：
  - [AnimUtils.register()](scripts/utils/anim_utils.ts:59)
  - [AnimUtils.unregister()](scripts/utils/anim_utils.ts:74)
  - [AnimUtils.animbinds()](scripts/utils/anim_utils.ts:84)
  - AC 预设： [PILegsAC](scripts/utils/anim_utils.ts:6), [PIArmsAC](scripts/utils/anim_utils.ts:12), [PIHoldingAC](scripts/utils/anim_utils.ts:18), [PILookAtTargetAC](scripts/utils/anim_utils.ts:24), [PIAttackRotationsAC](scripts/utils/anim_utils.ts:30), [PISneakingAC](scripts/utils/anim_utils.ts:37)

示例1：基于 DP 的玩家持握反向 AC 切换
- 依赖：玩家 DP 键 [dpList.player_animation_reverse](scripts/lists/dp_list.ts:6)，动画 ID 来自 [scripts/json/animation_ids.json](scripts/json/animation_ids.json)
- 绑定器： [AnimUtils.animbinds()](scripts/utils/anim_utils.ts:84)
```ts
import { world, Player } from "@minecraft/server";
import { AnimUtils, PIHoldingAC } from "./utils/anim_utils";
import { DPUtils } from "./utils/dp_utils";
import { dpList } from "./lists/dp_list";

AnimUtils.animbinds({
  dpId: dpList.player_animation_reverse,
  animbinds: {
    "holding_reverse_on": PIHoldingAC
  }
});

// 示例：当玩家进入世界后，打一个标记值以触发 AC
world.afterEvents.worldLoad.subscribe(() => {
  for (const p of world.getAllPlayers()) {
    DPUtils.store().player_animation_reverse.set(p, "holding_reverse_on", "");
  }
});
```

示例2：手动注册/卸载 AC（无需 DP）
- 注册：[AnimUtils.register()](scripts/utils/anim_utils.ts:59)
- 卸载：[AnimUtils.unregister()](scripts/utils/anim_utils.ts:74)
```ts
import { world } from "@minecraft/server";
import { AnimUtils, PIAttackRotationsAC } from "./utils/anim_utils";

world.afterEvents.worldLoad.subscribe(() => {
  for (const p of world.getAllPlayers()) {
    AnimUtils.register(p, PIAttackRotationsAC);
    // 一段时间后卸载
    setTimeout(() => AnimUtils.unregister(p, PIAttackRotationsAC), 5000);
  }
});
```

5.2 行为树工具 behavior_utils
- 文件：[scripts/utils/behavior_utils.ts](scripts/utils/behavior_utils.ts)
- 用途：定义行为树核心抽象与建造器，提供常用模板（怪物模板/跟随模板）与运行/绑定工具。
- 核心构造：
  - 枚举：[NodeState](scripts/utils/behavior_utils.ts:9)
  - 基础类型：[NodeExecutor](scripts/utils/behavior_utils.ts:58), [BehaviorNode](scripts/utils/behavior_utils.ts:61)
  - 黑板： [BlackboardManager](scripts/utils/behavior_utils.ts:70)
  - 工厂： [NodeFactory](scripts/utils/behavior_utils.ts:109)
  - 建造器： [BehaviorTreeBuilder](scripts/utils/behavior_utils.ts:302)
  - 运行体： [BehaviorTree](scripts/utils/behavior_utils.ts:430)
  - 管理器： [BehaviorUtils](scripts/utils/behavior_utils.ts:461)
  - 模板： [BehaviorTemplates.monster()](scripts/utils/behavior_utils.ts:610), [BehaviorTemplates.follow()](scripts/utils/behavior_utils.ts:685)

示例1：自定义简单行为树（检测目标 → 移动）
- 使用建造器 [BehaviorTreeBuilder.sequence()](scripts/utils/behavior_utils.ts:306), [BehaviorTreeBuilder.condition()](scripts/utils/behavior_utils.ts:340), [BehaviorTreeBuilder.action()](scripts/utils/behavior_utils.ts:328)
- 注册并绑定到实体： [BehaviorUtils.register()](scripts/utils/behavior_utils.ts:465), [BehaviorUtils.bind()](scripts/utils/behavior_utils.ts:470)
```ts
import { Entity } from "@minecraft/server";
import { BehaviorUtils, BehaviorTree, NodeState } from "./utils/behavior_utils";

BehaviorUtils.register("simple_move", (entity: Entity) =>
  BehaviorTree.create()
    .sequence("Root")
      .condition("HasTarget", (e)=> !!e.getEntitiesFromViewDirection()?.[0])
      .action("MoveToTarget", (e)=> {
        const target = e.getEntitiesFromViewDirection()?.[0]?.entity;
        if (!target) return NodeState.FAILURE;
        e.teleport(target.location);
        return NodeState.SUCCESS;
      })
      .end()
    .build()
);

// 绑定：例如在生成后
// BehaviorUtils.bind(entity.id, "simple_move");
```

示例2：使用模板跟随玩家
- 模板： [BehaviorTemplates.follow()](scripts/utils/behavior_utils.ts:685)
```ts
import { Entity, Player } from "@minecraft/server";
import { BehaviorUtils, BehaviorTemplates, NodeState } from "./utils/behavior_utils";

BehaviorUtils.register("follow_player", (e: Entity) =>
  BehaviorTemplates.follow(
    () => Array.from(e.dimension.getPlayers({ location: e.location, maxDistance: 128 }))[0] ?? null,
    (entity, target) => { entity.teleport(target.location, { rotation: target.getRotation() }); return NodeState.SUCCESS; },
    1 // 超过 1 格才靠近
  )
);

// BehaviorUtils.bind(entity.id, "follow_player");
```

5.3 左/右键工具 click_utils
- 文件：[scripts/utils/click_utils.ts](scripts/utils/click_utils.ts)
- 用途：提供“左键 Dummy 跟随与清理”的预注册行为，以及左键命中时的示例输出。
- 核心逻辑：
  - 预注册跟随行为： [BehaviorUtils.register()](scripts/utils/behavior_utils.ts:465) 在文件内注册 key 'follow_lclick_dummy'
  - 启/停左键 Dummy：监听 [DPUtils.store().lclick_enable.register()](scripts/utils/dp_utils.ts:88) 的回调（使用的 DP 键定义于 [dpList.lclick_enable](scripts/lists/dp_list.ts:4)）
  - 左键命中事件： [world.afterEvents.entityHitEntity.subscribe](scripts/utils/click_utils.ts:57)

示例1：开启左键 Dummy 跟随
```ts
import { Player } from "@minecraft/server";
import { DPUtils } from "./utils/dp_utils";
import { dpList } from "./lists/dp_list";

// 玩家 p 开启左键 Dummy
function enable(p: Player) {
  DPUtils.store().lclick_enable.set(p, true, false);
}
```

示例2：关闭左键 Dummy 并清理
```ts
import { Player } from "@minecraft/server";
import { DPUtils } from "./utils/dp_utils";

function disable(p: Player) {
  DPUtils.store().lclick_enable.set(p, false, false);
  // 行为树与清理逻辑会在内部定时回收
}
```

5.4 组件访问工具 comp_utils
- 文件：[scripts/utils/comp_utils.ts](scripts/utils/comp_utils.ts)
- 用途：通过动态代理快速按“驼峰小写”访问 @minecraft/server 的 EntityComponentTypes。
- 核心：
  - 代理创建：[createCompUtils()](scripts/utils/comp_utils.ts:56)
  - 导出对象：[CompUtils](scripts/utils/comp_utils.ts:87)
  - 快捷检测：[CompUtils.has()](scripts/utils/comp_utils.ts:60)
  - 快捷获取：[CompUtils.get()](scripts/utils/comp_utils.ts:66)

示例1：检测实体是否拥有 inventory 组件
```ts
import { Entity } from "@minecraft/server";
import { CompUtils } from "./utils/comp_utils";

function hasInventory(e: Entity) {
  return CompUtils.has(e, "inventory"); // 等同 entity.hasComponent(EntityComponentTypes.Inventory)
}
```

示例2：读取并修改移动速度组件
```ts
import { Entity } from "@minecraft/server";
import { CompUtils } from "./utils/comp_utils";

function boostMoveSpeed(e: Entity) {
  const move = CompUtils.movement(e); // 等同 getComponent(EntityComponentTypes.Movement)
  if (move) move.currentValue = (move.currentValue ?? 0.1) * 1.2;
}
```

5.5 伤害与属性工具 damage_utils
- 文件：[scripts/utils/damage_utils.ts](scripts/utils/damage_utils.ts)
- 用途：统一伤害结算，支持实体/物品属性叠加、临时属性、标签系数。
- 核心：
  - 属性接口：[DamageAttribute](scripts/utils/damage_utils.ts:7)
  - 常量：[DAMAGE_ADJUST_CONSTANT](scripts/utils/damage_utils.ts:16)
  - 缺省： [DEFAULT_ENTITY_ATTRIBUTE](scripts/utils/damage_utils.ts:18), [DEFAULT_ITEM_ATTRIBUTE](scripts/utils/damage_utils.ts:27)
  - 工具： [DamageUtils.setItemAttribute()](scripts/utils/damage_utils.ts:38), [DamageUtils.tempAttribute()](scripts/utils/damage_utils.ts:49), [DamageUtils.damageAttribute()](scripts/utils/damage_utils.ts:72), [DamageUtils.damage()](scripts/utils/damage_utils.ts:95)
  - 伤害标签： [DamageTags](scripts/lists/damage_list.ts:1)

示例1：为物品设置攻击属性并给予玩家
```ts
import { Player, EquipmentSlot } from "@minecraft/server";
import { ItemUtils } from "./utils/item_utils";
import { DamageUtils } from "./utils/damage_utils";
import { InventoryUtils } from "./utils/inventory_utils";

function giveSwordWithAttr(p: Player) {
  const sword = ItemUtils.fromId("minecraft:iron_sword").get();
  DamageUtils.setItemAttribute(sword, { atk: 5, critRate: 0.2, critDmg: 1.0 });
  InventoryUtils.equip(p, sword, EquipmentSlot.Mainhand, { onlyOnce: false, override: true });
}
```

示例2：对目标施加带标签的技能伤害
- 结算： [DamageUtils.damage()](scripts/utils/damage_utils.ts:95)
- 标签： [DamageTags.Common](scripts/lists/damage_list.ts:1)
```ts
import { Entity } from "@minecraft/server";
import { DamageUtils } from "./utils/damage_utils";
import { DamageTags } from "./lists/damage_list";

function skillHit(target: Entity, source?: Entity) {
  DamageUtils.damage(2.0, target, source, [DamageTags.Common]); // 技能倍率2倍
}
```

5.6 动态属性工具 DP（dp_utils）
- 文件：[scripts/utils/dp_utils.ts](scripts/utils/dp_utils.ts)
- 用途：统一封装动态属性（DP）的读/写/延时/激活/注册回调。
- 核心：
  - 入口映射：[DPUtils.store()](scripts/utils/dp_utils.ts:88)（将 [dpList](scripts/lists/dp_list.ts:1) 映射为一组 {curr/set/temp/activate...} 方法）
  - 基元函数： [DPUtils.set()](scripts/utils/dp_utils.ts:103), [DPUtils.temp()](scripts/utils/dp_utils.ts:137), [DPUtils.activate()](scripts/utils/dp_utils.ts:145), [DPUtils.deactivate()](scripts/utils/dp_utils.ts:159), [DPUtils.curr()](scripts/utils/dp_utils.ts:172), [DPUtils.prev()](scripts/utils/dp_utils.ts:179), [DPUtils.register()](scripts/utils/dp_utils.ts:191), [DPUtils.sync()](scripts/utils/dp_utils.ts:200)

示例1：临时开启“超级护甲”5秒后自动关闭
```ts
import { Entity } from "@minecraft/server";
import { DPUtils } from "./utils/dp_utils";

function superArmor5s(e: Entity) {
  DPUtils.store().effect_superarmor.temp(e, true, 100, false); // 100 tick ≈ 5s
}
```

示例2：计划在 3s 后给玩家开启某个 DP 标志
- 延时写入： [DPUtils.set(target, key, value, placeholder, delay)](scripts/utils/dp_utils.ts:103)
```ts
import { Player } from "@minecraft/server";
import { DPUtils } from "./utils/dp_utils";
import { dpList } from "./lists/dp_list";

function enableReverseAfter3s(p: Player) {
  DPUtils.store().player_animation_reverse.set(p, "holding_reverse_on", "", 60);
}
```

5.7 效果工具 effect_utils
- 文件：[scripts/utils/effect_utils.ts](scripts/utils/effect_utils.ts)
- 用途：通过 DP 注册回调，为“超级护甲/眩晕”两个效果建立统一入口。
- 核心注册：
  - 超级护甲回调：[DPUtils.store().effect_superarmor.register](scripts/utils/effect_utils.ts:6)
  - 眩晕回调：[DPUtils.store().effect_dizzy.register](scripts/utils/effect_utils.ts:15)

示例1：令非玩家实体长时间“眩晕”
- 触发回调： [DPUtils.store().effect_dizzy.set](scripts/utils/dp_utils.ts:88)
```ts
import { Entity } from "@minecraft/server";
import { DPUtils } from "./utils/dp_utils";

function dizzy(e: Entity, ticks = 200) {
  DPUtils.store().effect_dizzy.temp(e, true, ticks, false);
}
```

示例2：令玩家“眩晕”期间禁用移动与视角（由回调自动处理）
- 行为在回调内完成：[effect_utils.ts](scripts/utils/effect_utils.ts)
```ts
import { Player } from "@minecraft/server";
import { DPUtils } from "./utils/dp_utils";

function dizzyPlayer(p: Player, ticks = 100) {
  DPUtils.store().effect_dizzy.temp(p, true, ticks, false);
}
```

5.8 实体操作与查询 entity_utils
- 文件：[scripts/utils/entity_utils.ts](scripts/utils/entity_utils.ts)
- 用途：提供可编排的实体操作流水线（EntityOperation）与实体查询器（EntityQuery）。
- 核心：
  - 操作链： [EntityOperation.create()](scripts/utils/entity_utils.ts:21) → [.damage()](scripts/utils/entity_utils.ts:71) → [.slowness()](scripts/utils/entity_utils.ts:83) → [.superarmor()](scripts/utils/entity_utils.ts:89) → [.dizzy()](scripts/utils/entity_utils.ts:97) → [.knockbackBaseView()](scripts/utils/entity_utils.ts:110) 等
  - 查询器： [EntityQuery.entities()](scripts/utils/entity_utils.ts:246), [.limit()](scripts/utils/entity_utils.ts:320), [.sort()](scripts/utils/entity_utils.ts:325), [.sched()](scripts/utils/entity_utils.ts:330), [.get()](scripts/utils/entity_utils.ts:345), [.first()](scripts/utils/entity_utils.ts:348)

示例1：对附近敌对实体定时造成伤害与击退
```ts
import { Entity } from "@minecraft/server";
import { EntityQuery, EntityOperation } from "./utils/entity_utils";
import { TimeUtils } from "./utils/time_utils";

function aoe(entity: Entity) {
  const ticks = TimeUtils.ticks(0, 10, 5); // 5次，每次间隔10tick
  EntityQuery.entities(entity, { dist: 8, friendlyFire: false })
    .limit(8)
    .sched((e) => {
      EntityOperation.create()
        .damage(1.5, entity)
        .knockbackBaseLoc(entity, 0.3, 0.1)
        .run(e);
    }, ticks);
}
```

示例2：连击状态触发（Combo）
- 连击入口： [EntityOperation.triggerCombo()](scripts/utils/entity_utils.ts:193)
```ts
import { Entity } from "@minecraft/server";
import { EntityOperation } from "./utils/entity_utils";
import { dpList } from "./lists/dp_list";

function tryCombo(e: Entity) {
  EntityOperation.create()
    .triggerCombo(dpList.player_animation_combo, [
      { duration: 6,  wait: 6,  callback: (ent)=> {/* 第一段 */} },
      { duration: 10, wait: 10, callback: (ent)=> {/* 第二段 */} },
    ])
    .run(e);
}
```

5.9 背包与装备 inventory_utils
- 文件：[scripts/utils/inventory_utils.ts](scripts/utils/inventory_utils.ts)
- 用途：统一“给予/装备/移动/清理/绑定”操作。
- 核心：
  - 给予：[InventoryUtils.give()](scripts/utils/inventory_utils.ts:54)
  - 装备：[InventoryUtils.equip()](scripts/utils/inventory_utils.ts:64)
  - 背包容器： [InventoryUtils.entity()](scripts/utils/inventory_utils.ts:27), [InventoryUtils.block()](scripts/utils/inventory_utils.ts:31)
  - 装备容器： [InventoryUtils.equippables()](scripts/utils/inventory_utils.ts:35)
  - 绑定器： [InventoryUtils.itembinds()](scripts/utils/inventory_utils.ts:104)

示例1：给予并强制佩戴防具
```ts
import { EquipmentSlot } from "@minecraft/server";
import { InventoryUtils } from "./utils/inventory_utils";
import { ItemUtils } from "./utils/item_utils";

function equipArmor(p) {
  InventoryUtils.equip(p, ItemUtils.fromId("minecraft:iron_helmet").get(), EquipmentSlot.Head, { onlyOnce: true, override: true });
  InventoryUtils.equip(p, ItemUtils.fromId("minecraft:iron_chestplate").get(), EquipmentSlot.Chest, { onlyOnce: true, override: true });
}
```

示例2：基于 DP 绑定一组物品（进入状态自动发放）
- 绑定器： [InventoryUtils.itembinds()](scripts/utils/inventory_utils.ts:104)
```ts
import { InventoryUtils } from "./utils/inventory_utils";
import { ItemUtils } from "./utils/item_utils";
import { dpList } from "./lists/dp_list";

InventoryUtils.itembinds({
  dpId: dpList.npc_initiator, // 演示用：进入/离开状态时发放/清理
  itembinds: {
    "kit_basic": {
      inventory: [
        ItemUtils.fromId("minecraft:bread"),
        { item: ItemUtils.fromId("minecraft:torch"), slot: 0 },
      ],
    }
  }
});
```

5.10 物品工具 item_utils
- 文件：[scripts/utils/item_utils.ts](scripts/utils/item_utils.ts)
- 用途：以流式 API 构建 ItemStack，并可附带 DP。
- 核心：
  - 构造： [ItemUtils.fromId()](scripts/utils/item_utils.ts:28), [ItemUtils.fromItem()](scripts/utils/item_utils.ts:40)
  - 属性： [.keep()](scripts/utils/item_utils.ts:52), [.lock()](scripts/utils/item_utils.ts:67), [.withDP()](scripts/utils/item_utils.ts:73), [.withLore()](scripts/utils/item_utils.ts:78), [.withName()](scripts/utils/item_utils.ts:83), [.get()](scripts/utils/item_utils.ts:88)

示例1：构建不可丢弃、死亡不丢失的任务物品
```ts
import { ItemUtils } from "./utils/item_utils";

const questItem = ItemUtils
  .fromId("minecraft:book", 1)
  .withName("§6任务手册")
  .withLore(["§7请按指引操作"])
  .lock(true) // 锁槽 & 保留
  .get();
```

示例2：为物品写入 DP（供其他系统联动）
```ts
import { ItemUtils } from "./utils/item_utils";

const tagged = ItemUtils
  .fromId("minecraft:stick", 1)
  .withDP("minecraft_dev:special_key", 1)
  .get();
```

5.11 数学与向量 math_utils
- 文件：[scripts/utils/math_utils.ts](scripts/utils/math_utils.ts)
- 用途：提供通用数学、几何检测与向量链式工具。
- 核心：
  - 数学： [MathUtils.randomInt()](scripts/utils/math_utils.ts:12), [MathUtils.randomPickItems()](scripts/utils/math_utils.ts:15), [MathUtils.yaw()](scripts/utils/math_utils.ts:53)
  - 几何： [GeometryUtils.sphere()](scripts/utils/math_utils.ts:69), [GeometryUtils.cylinder()](scripts/utils/math_utils.ts:73), [GeometryUtils.sector()](scripts/utils/math_utils.ts:156) 等
  - 向量链： [VecUtils.start()](scripts/utils/math_utils.ts:204), [.moveF()](scripts/utils/math_utils.ts:245), [.moveR()](scripts/utils/math_utils.ts:239), [.end()](scripts/utils/math_utils.ts:220)

示例1：朝视线方向偏移 3 格并计算偏航角
```ts
import { Entity } from "@minecraft/server";
import { VecUtils, MathUtils } from "./utils/math_utils";

function lookAhead(e: Entity) {
  const to = VecUtils.start(e).moveF(3).end();
  const dir = e.getViewDirection();
  const yaw = MathUtils.yaw(dir.x, dir.z);
  return { to, yaw };
}
```

示例2：检测点是否在扇形内
```ts
import { GeometryUtils } from "./utils/math_utils";

function inSector(p, center, direction, height, angle, length) {
  return GeometryUtils.sector(p, center, direction, height, angle, length);
}
```

5.12 计时与序列 time_utils
- 文件：[scripts/utils/time_utils.ts](scripts/utils/time_utils.ts)
- 用途：统一封装 tick 定时与序列调度。
- 核心：
  - 列表生成：[TimeUtils.ticks()](scripts/utils/time_utils.ts:8)
  - 延时执行：[TimeUtils.timeout()](scripts/utils/time_utils.ts:12)
  - 序列执行：[TimeUtils.timeseries()](scripts/utils/time_utils.ts:29)

示例1：每 5 tick 执行一次、共 6 次
```ts
import { TimeUtils } from "./utils/time_utils";

const seq = TimeUtils.ticks(0, 5, 6);
TimeUtils.timeseries(()=>{/* do sth */}, seq);
```

示例2：立即与延时调用
```ts
import { TimeUtils } from "./utils/time_utils";

TimeUtils.timeout(()=>{/* 立即调用包裹 try/catch */}, 0);
TimeUtils.timeout(()=>{/* 60tick 后 */}, 60);
```

5.13 UI 工具 ui_utils
- 文件：[scripts/utils/ui_utils.ts](scripts/utils/ui_utils.ts)
- 用途：对话与 ActionForm 表单。
- 核心：
  - 对话： [DialogueUtils.dialogue()](scripts/utils/ui_utils.ts:9), [DialogueUtils.register()](scripts/utils/ui_utils.ts:22)
  - ActionForm： [ActionFormUtils.title()](scripts/utils/ui_utils.ts:41), [.body()](scripts/utils/ui_utils.ts:46), [.button()](scripts/utils/ui_utils.ts:51), [.show()](scripts/utils/ui_utils.ts:56)

示例1：打开 NPC 对话
```ts
import { DialogueUtils } from "./utils/ui_utils";

function openNpcDialogue(player, npc) {
  DialogueUtils.dialogue(player, npc, "minecraft:example_scene");
}
```

示例2：构建一个简单菜单
```ts
import { ActionFormUtils } from "./utils/ui_utils";

new ActionFormUtils()
  .title("测试菜单")
  .body("请选择一个操作")
  .button("打印日志", (p)=>p.sendMessage("clicked!"))
  .show(player);
```

5.14 虚影跟随 voidbind_utils
- 文件：[scripts/utils/voidbind_utils.ts](scripts/utils/voidbind_utils.ts)
- 用途：在指定位置/实体处生成一个短暂的“虚影实体”，支持跟随、动画、隐身与纠偏。
- 核心：
  - 选项： [VoidbindOptions](scripts/utils/voidbind_utils.ts:7)
  - 入口： [VoidbindUtils.voidbind()](scripts/utils/voidbind_utils.ts:25)

示例1：在玩家当前位置生成 1s 的虚影（不可见）
```ts
import { VoidbindUtils } from "./utils/voidbind_utils";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";
import { world } from "@minecraft/server";

function spawnGhost(player) {
  const dim = world.getDimension(MinecraftDimensionTypes.Overworld);
  VoidbindUtils.voidbind("minecraft:armor_stand", dim, player.location, { duration: 20, invisible: true });
}
```

示例2：生成跟随玩家、附带轻微随机偏移的虚影
```ts
import { VoidbindUtils } from "./utils/voidbind_utils";
import { world } from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";

function followGhost(player) {
  const dim = world.getDimension(MinecraftDimensionTypes.Overworld);
  VoidbindUtils.voidbind("minecraft:armor_stand", dim, player.location, {
    duration: 40,
    follow: { host: player, offsetF: 0.5, offsetY: 0.2, randomOffset: 0.1, correction: 6 }
  });
}
```


----------------------------------------
6. 常见开发任务范式（Recipes）
----------------------------------------

6.1 在玩家周围生成实体（环形散点）
- 关键 API： [VecUtils.start()](scripts/utils/math_utils.ts:204), [.moveF()](scripts/utils/math_utils.ts:245), [.moveR()](scripts/utils/math_utils.ts:239)
```ts
import { MinecraftEntityTypes } from "@minecraft/vanilla-data";
import { VecUtils } from "./utils/math_utils";

function summonAround(source) {
  for (let i = 0; i < 12; i++) {
    const loc = VecUtils.start(source).moveF(Math.random()*6-3).moveR(Math.random()*6-3).end();
    source.dimension.spawnEntity(MinecraftEntityTypes.IronGolem, loc);
  }
}
```

6.2 播放动画/粒子/音效（以动画为例）
- 关键 API： [AnimUtils.register()](scripts/utils/anim_utils.ts:59)
```ts
import { AnimUtils, PILegsAC } from "./utils/anim_utils";
AnimUtils.register(player, PILegsAC);
```

6.3 对实体施加效果/伤害
- 关键 API： [DamageUtils.damage()](scripts/utils/damage_utils.ts:95), [EntityOperation.slowness()](scripts/utils/entity_utils.ts:83)
```ts
import { DamageUtils } from "./utils/damage_utils";
import { EntityOperation } from "./utils/entity_utils";

DamageUtils.damage(1.2, target, attacker);
EntityOperation.create().slowness(40, 2).run(target);
```

6.4 管理物品与背包
- 关键 API： [ItemUtils.fromId()](scripts/utils/item_utils.ts:28), [InventoryUtils.give()](scripts/utils/inventory_utils.ts:54)
```ts
import { ItemUtils } from "./utils/item_utils";
import { InventoryUtils } from "./utils/inventory_utils";

InventoryUtils.give(player, ItemUtils.fromId("minecraft:bread", 16).get());
```

6.5 计时与调度
- 关键 API： [TimeUtils.ticks()](scripts/utils/time_utils.ts:8), [TimeUtils.timeseries()](scripts/utils/time_utils.ts:29)
```ts
const schedule = TimeUtils.ticks(0, 20, 3);
TimeUtils.timeseries(()=>{/* do 3 times every 1s */}, schedule);
```

6.6 UI 提示/表单
- 关键 API： [ActionFormUtils.title()](scripts/utils/ui_utils.ts:41), [.button()](scripts/utils/ui_utils.ts:51), [.show()](scripts/utils/ui_utils.ts:56)
```ts
new ActionFormUtils().title("提示").button("知道了", (p)=>p.sendMessage("OK")).show(player);
```


----------------------------------------
7. 最佳实践与注意事项
----------------------------------------

- 维度与命名空间
  - 始终确认维度（Overworld/Nether/End）一致性，命名空间统一以 `minecraft_dev:` 前缀（参考 [dpList](scripts/lists/dp_list.ts:1)）。
- 标签（tag）使用
  - 使用 [TagList.TargetedBy()](scripts/lists/tag_list.ts:4) 做“被目标锁定”标识，记得在目标丢失时移除（参考 [TargetEscape](scripts/utils/behavior_utils.ts:722) 分支逻辑）。
- 时间片/性能
  - 批量循环配合 [TimeUtils.timeseries()](scripts/utils/time_utils.ts:29) 分帧执行，避免单 tick 内大计算。
  - 行为树运行频率可控：由 [EntityEventIds.Timer](scripts/lists/event_list.ts:4) 驱动或外部定期触发 [BehaviorUtils.tick()](scripts/utils/behavior_utils.ts:494)。
- 动态属性（DP）原则
  - 读写一律通过 [DPUtils.store()](scripts/utils/dp_utils.ts:88) 派生的方法进行，以保证 prev/curr/回调/定时写等功能可用。
- 动画/锁定
  - 使用 [BehaviorTemplates.monster()](scripts/utils/behavior_utils.ts:610) 中的技能锁定机制（blackboard `skill_locking`）防止动作被抢占。
- 安全性
  - 命令执行请注意权限与目标选择器（示例使用 `@s`、`@e[tag="..."]`），避免污染其他实体。


----------------------------------------
8. 故障排查
----------------------------------------

- 权限/命令失败
  - 现象：`runCommand` 报错或无效
  - 检查：是否在合适的维度调用（如 Overworld），命令格式是否正确；参考 [scripts/init.ts](scripts/init.ts) 的 Gamerule 设置写法。
- ScriptEvent 无响应
  - 现象：`/scriptevent` 无效果
  - 检查：监听逻辑是否存在（参考 [scriptEventReceive.subscribe](scripts/debug.ts:10) / [scripts/utils/dp_utils.ts](scripts/utils/dp_utils.ts) 顶部三处监听），事件 ID 是否匹配 [ScriptEventIds](scripts/lists/event_list.ts:16)。
- 维度错误或实体不存在
  - 现象：spawn/teleport 报错
  - 检查：来源实体 `sourceEntity` 是否存在；在 [dp_utils.ts](scripts/utils/dp_utils.ts) 内部已对空目标做了保护（例如 [DPUtils.set()](scripts/utils/dp_utils.ts:103) 的早退判断）。
- 组件缺失
  - 现象：读取组件时报错
  - 检查：使用 [CompUtils.has()](scripts/utils/comp_utils.ts:60) 先判断，再 [CompUtils.get()](scripts/utils/comp_utils.ts:66) 或 `CompUtils.xxx(e)` 获取。
- ID 不存在
  - 现象：动画/实体/物品 ID 不识别
  - 检查：是否存在于对应 JSON 清单（如 [animation_ids.json](scripts/json/animation_ids.json), [entity_ids.json](scripts/json/entity_ids.json), [item_ids.json](scripts/json/item_ids.json)），或是 Vanilla 常量是否拼写正确。


----------------------------------------
附：入口与模块快速索引
----------------------------------------

- 入口文件：[scripts/main.ts](scripts/main.ts)
- 初始化： [world.afterEvents.worldLoad.subscribe](scripts/init.ts:4)
- 调试：
  - [world.afterEvents.worldLoad.subscribe](scripts/debug.ts:6)
  - [system.afterEvents.scriptEventReceive.subscribe](scripts/debug.ts:10)
- 事件/DP 列表：
  - [EntityEventIds](scripts/lists/event_list.ts:1)
  - [ScriptEventIds](scripts/lists/event_list.ts:16)
  - [dpList](scripts/lists/dp_list.ts:1)
- 工具核心：
  - [DPUtils.store()](scripts/utils/dp_utils.ts:88)
  - [TimeUtils.timeseries()](scripts/utils/time_utils.ts:29)
  - [VecUtils.start()](scripts/utils/math_utils.ts:204)
  - [BehaviorTreeBuilder.sequence()](scripts/utils/behavior_utils.ts:306)
  - [ActionFormUtils.show()](scripts/utils/ui_utils.ts:56)
  - [VoidbindUtils.voidbind()](scripts/utils/voidbind_utils.ts:25)
