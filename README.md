

# mcbe-dev使用文档

mcbe-dev是我在minecraft基岩版开发过程中积累的一个模板工程，到现在已经迭代为了一个颇为强大的综合系统，基于此可以非常轻松地实现原生开发难以实现甚至效率上说不可能的各种效果，同时也很大程度上提升了常见的堆量工作（包括技能、生物等的编写）的效率。本文档会比较详细地介绍整个mcbe-dev中涉及的各类思想、设计模式以及各种工具的使用。

----

mcbe-dev主要是针对两类目的而编写的：

## 提高开发效率

addon开发最常见的需求，就是编写玩家技能和编写生物，这些堆量需求在原生的条件下开发，流程是非常繁琐的：要将bbmodel导出模型、贴图、动画，要编写att.json，ce.json，ac.json，rc.json等rp文件，要编写se.json，item.json等bp文件，最后还要编写对应的脚本等等。手动进行这些流程效率低而且非常影响开发体验，而由于这些工作常常具有高度的重复性，所以完全可以用一些自动化部署脚本来规避掉大量重复劳动，然后自己主要把精力放在技能、生物本身的代码逻辑上。tools文件夹下的ts脚本主要就是实现自动化部署的各项功能，其中bbpack.ts，bbmodel.ts主要负责美术资源本身的批量部署，包括模型、贴图、动画、粒子等，而batchbp、batchrp主要负责基于模板批量部署se.json/item.json/ce.json/att.json这类配置文件。其他的如reference.ts，resource.ts等则负责了更细节的功能，如为脚本提供ID的引用支持、部署音频、部署物品贴图、部署lang文件等。

除了美术资源部署的提速以外，脚本逻辑的编写本身也有很大的效率提升空间。例如，minecraft基岩版原生提供的接口对于空间偏移的计算、时间延迟的计算、生物操作、物品操作等等需求，虽然都可以实现，但是实现起来代码总是非常臃肿，于是脚本端进行工具的封装就能够很大程度上提高开发效率。scripts/utils下的各种文件有许多就是基于这方面的需求编写的，例如math_utils里面集成了一个VecUtils用于空间向量计算，time_utils提供了timeout和timeseries两类常见的时间延迟方法供使用。

## 实现特殊功能

由于minecraft基岩版本身官方接口的各种局限性，很多在别的游戏里“理所当然”的功能，在addon开发中的实现却会变得异常困难。例如如何检测玩家左键？左键在战斗类addon中通常会被认为是普通攻击，所以本来是一个很常见的需求，但是mc基岩版居然没有提供检测玩家左键的接口，于是我们只能通过在玩家前方召唤一个透明实体，通过玩家击中这个实体触发事件来判定玩家左键。这类做法确实看上去非常不美观，但是在addon开发中，为了实现这些原生不支持的功能，这类不美观的做法其实某种程度上是很常见的。具体来说包括：1. 检测玩家左键 2. 播放玩家粒子 3. 更加流畅地播放玩家动画 4. 管理生物目标 5. 实现自定义effect 等等。而为了实现这些疑难的需求，就有了很多对应的脚本文件，包括anim_utils、behavior_utils、effect_utils、voidbind_utils等。

另外，minecraft的世界生成是一个非常复杂的学问，其关键的feature编写由于原生提供的写法效率非常低，我也针对此开发了一个集可视化节点编辑、molang代码文本编辑、json批量编辑等各种机制为一体的综合解决方案。相关代码文件在tools-feature文件夹中，其中feature.html为可视化编辑的核心文件，deploy.py用于将数据部署到behavior_packs\name_space\features中。

----

接下来就是各项功能更加详细的说明：

## 美术资产部署

bbpack和bbmodel文件用于将预先整理好的美术资产一键部署到工程中。具体来说，只要你预先将美术资产整理成了类似这样的文件夹：

![image-20260101135403956](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101135403956.png)

![image-20260101135416025](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101135416025.png)

![image-20260101135423792](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101135423792.png)

![image-20260101135436218](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101135436218.png)

通过跑bbpack.ts和bbmodel.ts这两个脚本，就可以直接将geo.json，animation.json，particle.json等关键美术资产直接部署到工程中：

![image-20260101135525396](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101135525396.png)

![image-20260101135532734](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101135532734.png)

![image-20260101135541467](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101135541467.png)

为了实现这种一键部署，事实上经过了非常多波折。比如分析bbmodel文件，对照geo.json,animation.json的格式，编写出bbmodel数据解析的代码，比如进行模型贴图、粒子贴图的路径重定位、命名规范检查、处理步帧、处理异常数值等等，各种实际工作中常见的坑都踩过并考虑到，最终才形成了比较完善的自动化部署体验。

## 配置文件模板化编写

通过batchbp.ts和batchrp.ts，可以实现基于一些预置的模板，辅以对应的数据信息，批量生成se.json/item.json/ce.json/att.json/ac,json/rc.json这类配置文件，极大提高json编写的效率。具体的工作流程就是，首先定义类似如下的模板：

![image-20260101140332882](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101140332882.png)

以及在data.ts中定义各个具体物品/生物的数据信息：

![image-20260101140459130](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101140459130.png)

![image-20260101140500609](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101140500609.png)

然后在batchbp.ts或batchrp.ts中调用这些模板和数据：

![image-20260101140606772](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101140606772.png)

![image-20260101140611284](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101140611284.png)

就可以直接将对应的json文件部署到工程中：

![image-20260101140644241](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101140644241.png)

![image-20260101140656121](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101140656121.png)

当然，由于需求的不同，模板可能是需要你根据实际需求来自行编写的，但是这种基于模板批量生成json文件的思想是非常实用的，适应了这类思想后，编写堆量任务的效率会显著地提高。

## 其他tools工具

主要是import.ts、reference.ts和resource.ts，其是一些小工具，比如一键将ts脚本import到main.ts、生成ref.json参考文件便利代码编写、部署物品贴图/音频/lang文件等边角料等。总体来说并不复杂，看代码就能直接明白其作用。

## DP系统

DP系统全称Dynamic Property系统，也就是动态属性系统。mc基岩版脚本接口提供了`getDynamicProperty/setDynamicProperty`这一套能力，其本质是“把一些数据直接持久化到实体/物品/世界对象上”，并且可以跨tick保存。mcbe-dev几乎所有“需要跨tick记状态”的系统都会依赖DP：玩家输入状态、技能冷却、怪物目标、各种effect开关、行为树的blackboard、甚至延迟执行队列等等。

mcbe-dev中DP系统主要由三部分组成：

1. `scripts/lists/dp_list.ts`与`dp_list_v2.ts`：集中声明所有DP键名（如`minecraft_dev:mob_target`），避免散落在代码里写字符串导致维护困难。
2. `scripts/utils/dp_utils.ts`：对底层DP API做了“统一封装 + 自动序列化 + prev记录 + 订阅回调 + 延迟执行”等增强。
3. 一些与DP联动的“同步任务/调试命令”：例如玩家状态同步、DP时间线执行器、以及`scriptevent`调试接口。

### store()：把DP当成“有类型的字段”来用

最常用的写法是`DPUtils.store().xxx`，其中`xxx`来自`dp_list`。`store()`返回的对象为每个DP键提供了一套统一的操作：

- `curr(target, placeholder?)`：读当前值；如果没有写入过则返回占位值。
- `prev(target, placeholder?)`：读上一帧值（内部约定存到`${key}_prev`）。
- `both(target, placeholder?)`：同时拿curr/prev。
- `set(target, value, placeholder?, delay?)`：写值；value可以是函数（会把当前值作为参数传入，方便做“基于旧值更新”）。
- `cancel(target, startTick?)`：取消延迟写入（只对实体的延迟写入生效）。
- `temp(target, value, ticks, placeholder?)`：临时写值，ticks后自动恢复到原值（本质是`set`+延迟`set`）。
- `register(callback)`：注册一个“DP变更回调”。

这一层最大的价值就是：你写技能/系统逻辑时不用再关心“到底这个DP存在哪、怎么序列化、怎么拿prev、怎么做延迟”，直接当成字段来读写即可。

### 自动序列化与脏检查

动态属性底层只支持`number/boolean/string`，而mcbe-dev大量使用对象/数组（例如`mob_skill_cooldowns`是一张表）。`DPUtils`的策略是：

- 写入时：`number/boolean`原样写；其他结构用`JSON.stringify`写入string；`undefined`表示清除。
- 读取时：如果是string则尝试`JSON.parse`，失败则按纯字符串返回；如果没写入过则返回placeholder。
- 写入时额外做了**脏检查**：新旧raw值相同则不调用底层API（避免大量重复写导致性能浪费）。
- 每次写入都会把旧值同步到`${key}_prev`，因此`prev()`可以稳定工作。

### DP注册回调与DP->Property同步

`DPUtils.register(key, callback)`允许你在DP变化时做响应式逻辑，典型用途之一是把“脚本态”同步到“数据驱动态”，例如：

- `DPUtils.sync(key, propertyId, placeholder)`：当DP变化时自动`setProperty`，这样你就能在`component_groups`/`animation_controller`里直接用property做判定（property能被原生系统理解，而DP不能直接被Mol/AC读取）。

这一点在“技能状态驱动动画/行为”时非常关键：脚本写DP，数据驱动读property，从而打通两套体系。

### 延迟写入：DP Timeline

mcbe-dev里有一套基于DP实现的延迟执行队列：`world_dp_timeline`。当你调用`DPUtils.set(entity, key, value, placeholder, delay)`并且`delay > 0`时，并不是立刻写实体DP，而是把“待执行写入”记录到world的timeline里，在对应tick由一个全局`runInterval`统一执行。

这一套设计有两个好处：

- 延迟任务可以被序列化持久化（world DP），即使某些系统重载/逻辑重入也不会丢。
- 通过`cancel()`可以统一取消未来某段时间内的计划写入，用于“打断状态/打断技能”。

### 调试接口：scriptevent读写DP

`dp_utils.ts`里预置了`scriptevent`调试口：

- `event:dp_list`：打印触发实体的所有DP及其值
- `event:dp_set`：对触发实体写DP（支持`key=value`或仅`key`默认true）
- `event:dp_reset`：对触发实体清DP
- `event:dp_list_world / event:dp_set_world / event:dp_reset_world`：对world DP同理

这类调试手段在开发期非常省时间：很多时候你只想确认某个DP到底有没有被写、写成了什么、prev是不是正常更新，用命令就能立刻看。

----

## time_utils和math_utils

`time_utils`和`math_utils`可以理解为“脚本端的基础设施”。它们并不直接实现某个具体玩法，而是把mc原生接口里最常见、最繁琐的两类工作抽象出来：**时间调度**和**空间/几何计算**。这两块越早封装越好，因为几乎所有技能、生物、特效系统都会频繁调用。

### TimeUtils：把tick调度写成可读的链式/批量逻辑

mc脚本最常见的写法之一是`system.runTimeout/runInterval`。原生写多了会出现两个痛点：

- 逻辑分散：很多延迟动作会散落成一堆runTimeout，很难维护。
- 异常传播：某个回调报错可能导致一段逻辑链中断（开发期尤其烦）。

`TimeUtils`提供了三类常用能力：

- `timeout(callback, tick)`：对`runTimeout`做封装，并在`TIMEOUT_TRYCATCH=true`时自动try/catch，避免调度链被异常打断。tick为0时立即执行。
- `timeseries(callback, ticks, params?)`：批量调度。你传入一个tick数组（例如`[0, 5, 10, 20]`），它会在这些时刻依次回调，params可选用于给每次回调传参。
- `timer(callback, interval)`：对`runInterval`做简单包装，并自动遍历全服玩家逐个执行callback（适用于玩家状态轮询、HUD更新等）。

在mcbe-dev里，你会看到大量系统采用`timeseries + ticks()`来组织“技能分段执行”，因为可读性比一堆runTimeout高得多。

### MathUtils/VecUtils/GeometryUtils：把空间问题变成工具问题

`math_utils.ts`里主要有三块：

1. `MathUtils`：一些通用数学工具，比如带权随机、距离平方、yaw计算等。这里的`distanceSquared`在AI/跟随等高频判定中很常用（避免每次都开方）。`yaw(x,z)`用于把方向向量转换成水平朝向角，配合`setRotation`可以实现“定向/转向”。
2. `GeometryUtils`：几何体检测工具（球、圆柱、圆锥、长方体、矩形、扇形）。战斗类addon最常见的需求就是“判定某个点/实体是否落在攻击判定范围内”，用几何体表达会比写一堆if更稳定也更好复用。
3. `VecUtils`：向量链式工具。其核心是`start(...).moveF().moveY().moveR().end()`这一套“相对位移”API（F/Y/R=前/上/右），用于快速计算技能出生点、偏移点、相机点等。并且支持把Entity或Vector3作为起点，也支持`moveToBlock/moveToEntity/moveYToBlock`这类“贴地/对准视线目标”的常见操作。

这三块合在一起，会显著降低你写技能时的“空间计算成本”：你不用每次都手动做坐标系、点乘/叉乘、归一化、yaw换算等繁琐细节。

----

## entity_utils

`entity_utils`可以看作“技能/生物操作的中枢工具”。它的设计目标非常明确：把原生API中“碎片化的实体操作”整合成一套更适合写玩法逻辑的抽象层。其内部又分成三层：状态读取、动作编排、目标查询。

### EntityState：统一的状态读取

`EntityState`主要解决两个问题：

- 目标系统：通过`DPUtils.store().mob_target`统一记录“当前目标实体id”，然后`EntityState.target(entity)`/`targetDist`/`targetCosine`等方法把常用判定封装起来（距离范围、朝向夹角范围等）。这比每个技能都自己算一次要稳很多，也能统一处理“没有目标”的兜底。
- 常用状态：比如`healthPercent`、`airHeight`（脚下离地高度）等，都是战斗/移动逻辑经常要用到的。

### EntityOp：把技能写成“脚本化时间轴”

`EntityOp`是mcbe-dev里写技能最核心的类之一。它本质是一个“步骤队列”，每个步骤包含：在第几tick执行、执行什么动作。你可以：

- `at(tick)`/`wait(ticks)`控制时间游标
- `do(callback, condition?)`插入一个动作
- `for(ticks)`把上一个动作按多个间隔重复执行（很适合做连段、持续粒子、持续击退等）
- `run(entity)`把整条时间轴调度出去（内部用`TimeUtils.timeout`执行）

在此基础上，EntityOp又内置了大量“常用技能动作”的封装：播放动画、生成粒子、播放音效、写DP、加buff、击退、瞬移、相机控制、设置目标、触发combo等。你写技能时往往只需要把这些积木按时间拼起来即可，代码会非常短、非常像技能脚本。

### EntityQr：把实体查询写成可组合的“查询器”

原生`dimension.getEntities`虽然能查，但写复杂过滤会很臃肿。`EntityQr`做了几件事：

- 支持以Entity为基准点，用`VecUtils`做偏移（FYR）后再查询（技能的“前方扇形/矩形”类判定特别常见）。
- 提供统一过滤：排除投射物/假人、排除npc、可选忽略友伤（基于`entity_faction` DP）、可选忽略不可被锁定目标（`effect_untargetable`）。
- 提供`sort/limit/first/get`等API，减少你手写“找最近N个”的样板代码。
- `sched(callback, ticks, params?)`：把“在某些tick对查询结果执行动作”直接封装掉，并通过`entity_sched_id` DP实现可打断调度（例如技能被打断时把sched_id设为undefined即可中断后续执行）。

最后`EntityUtils.sched`只是对“多个`qr+op+tk`组合调度”做了一个更方便的批量入口。



![image-20260101150517237](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101150517237.png)

----

## behavior_utils

（文件名是`behavior_utils.ts`，这里沿用标题写法。）

`behavior_utils`实现了一套**纯脚本行为树框架**，用于解决“数据驱动AI不够灵活/难以与复杂技能系统联动”的问题。它并不是要完全替代原生AI，而是把“高层决策 + 技能选择 + 状态锁定/打断 + 目标管理”这类逻辑统一拉到脚本里实现，从而和DP系统、EntityOp系统形成闭环。

### 为什么行为树一定要和DP绑定？

行为树的关键是“节点需要跨tick记住运行态”，例如Sequence/Selector的游标、Wait节点的计数器、技能是否锁定等。如果这些状态只放在JS对象里，一旦实体重载/脚本热更/复杂场景下对象失效，就很难保证稳定性。

mcbe-dev的选择是：

- 用`mob_behavior_state` DP保存节点运行态（每个节点一个path，内部存`currentIndex/elapsedTicks`等）。
- 用`mob_blackboard` DP保存blackboard（技能系统、目标系统的共享状态都放这里）。

这样一来，行为树和实体是强绑定的：只要实体还在，状态就稳定可追踪。

### 行为树框架：Builder + Factory + Decorator

behavior_utils里实现了比较完整的一套行为树抽象：

- `NodeState`：SUCCESS/FAILURE/RUNNING三态
- `NodeFactory`：创建基础节点、sequence/selector/parallel、decorator/inverter/repeater、action/condition/wait等
- `BehaviorTreeBuilder`：链式搭树（建造者模式），让树结构在代码里更可读
- `BehaviorTree`：每tick执行一次`tick(entity)`，并在非RUNNING时自动reset子节点

这里非常关键的一个工程细节是：每个节点会分配一个稳定的`__path`（包含父路径与序号），并以此作为DP状态存取的key，避免“重名节点导致状态串号”。

### BehaviorUtils：注册、绑定与tick驱动

`BehaviorUtils`是行为树的管理器：

- `register(treeId, factory)`：注册某个实体typeId对应的行为树工厂，并自动在实体spawn时绑定
- `bind(entityId, factoryKey)`：把某个实体id绑定到某棵树（映射存在`world_behavior_map` DP里）
- `tick(entity)`：取出映射并运行对应树
- `reset(entity)`：清理该实体的运行态与blackboard

同时它还有一个定时GC，把`world_behavior_map`里已经不存在的实体id清掉，避免世界DP无限膨胀。

### BehaviorTemplates：把“怪物AI”写成可配置模板

`BehaviorTemplates.monster(...)`提供了一套通用怪物逻辑的模板化拼装：出生处理、死亡处理、受击处理、眩晕处理、有目标时的技能系统、无目标时的游荡/找目标等，并且把技能抽象成`SkillConfig`：冷却、filter、duration锁定、once一次性执行等。

其效果是：你做新怪物时往往只需要提供skills列表和少量自定义action，就能复用整套“目标-技能-锁定-打断”的通用框架。

### 与数据驱动事件联动

behavior_utils底部把`world.afterEvents.dataDrivenEntityTrigger`事件汇总到一个`eventHandlers`表里处理（Timer/Death/Hurt/TargetAcquired/TargetEscape）。这意味着：你在BP里只要让实体在合适的时机触发这些eventId，脚本端就能接管AI状态与DP记录，形成“数据驱动触发、脚本驱动决策”的混合架构。



![image-20260101150455751](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101150455751.png)

----

## inventory_utils

`inventory_utils`解决的是另一类非常常见但原生写起来很烦的需求：**读写背包/装备栏/容器**。mc原生虽然提供了Inventory/Equippable组件，但每次使用都要写一堆component获取、slot遍历、空位处理等样板代码。

`InventoryUtils`把这些工作统一收敛成一组静态方法：

### 基础访问

- `entity(entity)`：获取实体背包container（Inventory组件）
- `equippables(entity)`：获取装备栏组件（Equippable组件）
- `block(block)`：获取方块容器（箱子等）
- `items(entity)`：把背包每格 + 6个装备位（头胸腿脚主手副手）统一列出来（便于做“是否拥有某物品”的判定）

### 常用操作

- `count(entity, typeId)`：统计背包中某种物品的总数量
- `consume(entity, [{typeId,count}], consume=true)`：检查并可选消耗材料（常用于技能释放/制作/升级）
- `give(entity, item, {onlyOnce?, slot?})`：给物品；支持“仅发一次”与“指定槽位”（会先把该槽位物品挪走）
- `equip(entity, item, slot, {onlyOnce?, override?})`：穿戴装备；支持“仅一次/不覆盖已有装备”
- `replace(entity, rep, slot)`：对某个装备位做函数式替换（适合做耐久/附魔/属性改写）
- `clear/remove`：基于命令或slot清理物品
- `move(entity, slots)`：把指定槽位的物品挪到其它空槽（用于“强制占用快捷栏某格”的玩法）

### itembinds：用DP驱动“键位/武器形态切换”

inventory_utils里最有工程味的一块是`itembinds`：它允许你把“某个DP状态”映射到“一套物品绑定方案”（背包物品 + 6件装备）。当某些DP触发变化时（通过DP的register机制），系统会自动：

1. 清理上一套绑定对应的物品/装备
2. 发放/穿戴当前绑定对应的物品/装备
3. 把当前绑定记录到`player_prev_itembind`，用于下次切换时做差分清理

这在战斗类addon里非常常见：例如呼吸流派切换、武器形态切换、不同技能栏配置切换等。你只需要关心“DP怎么变”，背包怎么同步由系统兜底即可。

![image-20260101150420293](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101150420293.png)

----

## Voidbind Utils

Voidbind即虚空绑定，其本质上其实是一类bbmodel文件：它没有模型贴图，但是有组和locator，用于通过动画的方式播放粒子。由于addon开发禁止修改玩家ce.json文件，而动画的粒子配置又是在玩家ce.json中进行的，所以如何播放玩家动画中的粒子，实际上是一个较大的难题。而解决方式就是使用voidbind：在玩家位置召唤一个虚空绑定实体，然后让这个实体播放动画，由于虚空绑定实体本身是自定义的实体，所以我们就可以在它的ce.json中配置粒子，于是就可以正常播放粒子了。但是单纯召唤出虚空绑定实体仍然会有问题：1. 其朝向可能不是玩家的方向，导致粒子播放的方向错误 2. 如果玩家移动，虚空绑定实体应该要跟着玩家移动 3. 如果玩家移速比较快，那么单纯高频tp到玩家原位可能会产生滞后感，需要矫正 4. 很多时候我们希望引用到这个虚空绑定实体，以其为中心进行一些实体操作 等等。为了解决上述各种问题，就有了这个voidbind_utils文件。voidbind、voidbindV2等方法有一些微妙的区别，这里就不详细介绍了。

![image-20260101150549210](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101150549210.png)



## Anim Utils

这一文件主要解决播放玩家动画的一些疑难问题。由于不能修改玩家的ce.json文件，所以涉及动画控制器的比较复杂的动画控制，就不能像自定义生物一样做。很长一段时间内我们其实都是直接通过playanimation来播放玩家技能动画的，但是这种播放方式总是不可避免动作的僵硬性。解决这一问题的突破口在于minecraft基岩版的playAnimation方法，通过一种比较隐晦的方式提供了在游戏运行时动态注入动画控制器的功能。而利用这一功能，我开发了anim_utils.ts这个脚本，最终实现了在脚本端通过编写类似动画控制器但是又略有不同的方式来迂回地进行玩家动画的控制。

![image-20260101151116814](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101151116814.png)

此外，播放玩家动画还会碰到一个常见问题是，玩家的武器可能不是完全刚体，其本身可能在释放技能的时候也有动画变化。然而对玩家进行playAnimation是无法让手中的武器也响应的，理论上还是得经由att.json中配置的动画控制器相关逻辑来实现。然而这种把武器和玩家动画分开来的做法，会导致代码编写变得异常繁琐，我们肯定还是希望通过一行动画播放的代码就实现玩家和武器同时播放正确动画的。为了解决这一问题，anim_utils还引入了通过playAnimation修改molang变量的机制，通过播放类似这种预定义的辅助动画：

![image-20260101151510265](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101151510265.png)

设置molang变量，然后在att.json中按照约定的格式排放动画定义：

![image-20260101151604133](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101151604133.png)

辅以合适的动画控制器，就能够实现通过脚本端播放“slot动画”来播放attachable动画；然后把这种slot动画和玩家本身动画播放的机制集成，就可以实现一条代码同时播放玩家和attachable动画了。



# Player Utils

player_utils的核心目的在于检测玩家操作，比如左键、右键、移动、ctrl（疾跑）、shift（下蹲）、空格（跳跃）等等。由于MC本身的限制，上述这些检测在原生状态下实际上都比较繁琐，导致如果我们想做一些类似连招搓招之类的效果，都比较困难。player_utils旨在逐一击破这些按键检测问题，把其中的复杂性封装到内部，对外只暴露方便的接口，来最终让我们能够以非常简洁直观的方式编写玩家技能的出招表系统。

![image-20260101152238128](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101152238128.png)



---

# Feature可视化编辑平台

minecraft世界生成的原理实际上很复杂，可以说世界生成算法正是minecraft的精髓所在。市面上能够完全掌握这方面原理并由此创作出独特美观地形的addon实际上很少，我花费了相当大的功夫最终形成了这个基于可视化编辑的feature编写平台，可以说提供了一个直观、高效的feature编写系统解决方案。最终达成的效果图有这些：

![image-20260101152724418](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101152724418.png)

![image-20260101152734995](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101152734995.png)

![image-20260101152743995](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101152743995.png)

![image-20260101152751516](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101152751516.png)

如果稍微入门了世界生成并理解了feature编写的复杂性的话，你一定会以为这些地形的编写可能要花费一周乃至数周的时间，但是事实是：上述这些地形，平均一个都在一天以内就完成了（当然，建筑结构素材是建筑师提供的），靠的就是这个可视化编辑平台。

具体来说，这个平台的核心就是这个feature.html文件，它是gpt生成的，但是经过了我在使用中的反复迭代，因此解决了诸多使用上的痛点。点进去后界面大概是这样：

![image-20260101153154931](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101153154931.png)

选择root_feature.json或新建后，中间就会出现可编辑的节点：

![image-20260101153228060](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101153228060.png)

而feature编写的实际流程就是，写出这样一个复杂的feature树：

![image-20260101153312019](C:\Users\Administrator\AppData\Roaming\Typora\typora-user-images\image-20260101153312019.png)

编写完成后点击保存就会在你的工程目录下生成root_feature.json文件，点击导出会生成features.zip的zip包，解压后放到你的bp/features里面就完成了部署（你也可以跑tools-feature/deploy.py通过命令部署）

为什么这种流程是有效的呢？其核心的原因在于，feature的组织方式本质上是一棵树，在树中通过分叉的方式形引导出不同类的地形，而通过各种噪声计算来实现单个地形的图样。由于地形生成本质上是一个高深的数学学问，在此不可能一次性讲明白，最好的方式肯定还是案例化的学习。我只能大致给出学习的方向：

1. 理解什么是柏林噪声
2. 理解如何通过柏林噪声划分区域
3. 理解如何绘制有起伏的平原、山脉、空岛等常见地形
4. 理解在MC中如何削平一块区域以在其上方进行地形编辑
5. 理解在MC中大型建筑结构的生成原理

等等。总之，在进行了相关的学习并深度理解了一两个案例之后，你也就可以基于这个feature可视化交互平台高效地进行地形编辑了。

另外，feature.html还一个核心机制名为sync，其实现的是将scatter节点的iteration（通常会在此处编写复杂的molang代码）以及子节点的root_feature.json导出为molang文本文件 / json文件，同时支持将这些导出的文件中的代码又同步到节点内部。最终实现的是你可以在IDE中编写molang代码然后点击sync把代码同步到节点图中。为什么说这个功能重要呢？这是因为文本化实际打开了AI代码编写的大门，目前gpt5.2基本上可以胜任大多数地形molang编写的工作，最终你只需要向gpt提需求，gpt输出molang文件，你将其同步到节点中，然后部署，就可以直接进入游戏中看效果了。这一流程实际上非常强大，如果自己写molang的话效率其实很慢，且如果不熟悉相关写法，单个molang文件总是写不长，也就无法做出特别复杂的地形。但是gpt生成的molang代码可以达到几百行之多，其编写的地形上限非常高。