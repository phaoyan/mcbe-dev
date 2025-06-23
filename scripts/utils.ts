import { Vector3Utils } from "@minecraft/math";
import { Block, BlockComponentTypes, BlockInventoryComponent, Container, Dimension, Entity, EntityComponentTypes, EntityEffectOptions, EntityInventoryComponent, EntityProjectileComponent, ItemStack, Player, system, Vector3, World, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";


export class MathUtils {
    static valueMap(state: any, from: any[], to: any[]): any {
        return to[from.indexOf(state)]
    }


    static randomInt(from: number, to: number){
        return Math.floor(Math.random() * (to-from)) + from
    }
    static randomPickItems<T>(array: T[]): T {
        if (array.length === 0) {
            throw new Error("Cannot pick from an empty array");
        }

        const randomIndex = Math.floor(Math.random() * array.length);
        return array[randomIndex];
    }
    static randomPickIndex(list: number[]) {
        if (list.length === 0) return 0
        const totalWeight = list.reduce((sum, weight) => sum + weight, 0);
        if (totalWeight === 0) {
            return Math.floor(Math.random() * list.length);
        }
        let random = Math.random() * totalWeight;
        for (let i = 0; i < list.length; i++) {
            random -= list[i];
            if (random < 0) {
                return i;
            }
        }
        return list.length - 1;
    }

    static multiply(arr: number[]){
        return arr.reduce((acc, curr) => acc * curr, 1)
    }
    static square(vector: Vector3){
        return vector.x**2 + vector.y**2 + vector.z**2
    }
    static tanToDegrees(tanValue: number): number {
        // 计算反正切（返回弧度）
        const radians = Math.atan(tanValue);
        // 将弧度转换为角度
        const degrees = radians * (180 / Math.PI);
        return degrees;
    }

}

export class VecUtils {
    static sphere(point: Vector3, startPoint: Vector3, radius: number): boolean {
        return Vector3Utils.distance(point, startPoint) < radius
    }

    static cylinder(
        point: Vector3,
        startPoint: Vector3,
        direction: Vector3,
        radius: number,
        length: number
    ): boolean {
        const dirNormalized = Vector3Utils.normalize(direction);
        const pointToStart = Vector3Utils.subtract(point, startPoint);

        // 计算点在方向上的投影长度
        const projectionLength = Vector3Utils.dot(pointToStart, dirNormalized);

        // 如果投影在圆柱范围外
        if (projectionLength < 0 || projectionLength > length) {
            return false;
        }

        // 计算点到轴线的距离平方
        const projectionVec = Vector3Utils.scale(dirNormalized, projectionLength);
        const perpendicularVec = Vector3Utils.subtract(pointToStart, projectionVec);
        const distanceSquared = Vector3Utils.dot(perpendicularVec, perpendicularVec);

        return distanceSquared <= radius * radius;
    }

    static cone(
        point: Vector3,
        startPoint: Vector3,
        direction: Vector3,
        angle: number,
        length: number
    ): boolean {
        const dirNormalized = Vector3Utils.normalize(direction);
        const pointToStart = Vector3Utils.subtract(point, startPoint);

        // 计算点到顶点的距离
        const distance = Vector3Utils.magnitude(pointToStart);
        if (distance === 0) return true; // 点就是顶点
        if (distance > length) return false; // 超出最大距离

        // 计算点与锥轴线的夹角
        const pointDir = Vector3Utils.scale(pointToStart, 1 / distance);
        const cosTheta = Vector3Utils.dot(pointDir, dirNormalized);
        const halfAngle = angle / 2;

        return cosTheta >= Math.cos(halfAngle);
    }

    static sector(
        point: Vector3,
        startPoint: Vector3,
        direction: Vector3,
        height: number,
        angle: number,
        length: number
    ): boolean {
        // 首先检查高度
        if (Math.abs(point.y - startPoint.y) > height / 2) {
            return false;
        }

        const dirNormalized = Vector3Utils.normalize(direction);
        const pointToStart = Vector3Utils.subtract(point, startPoint);
        pointToStart.y = 0; // 忽略Y轴，因为高度已经单独检查

        const distanceSquared = Vector3Utils.dot(pointToStart, pointToStart);
        if (distanceSquared === 0) return true; // 点就是起点
        if (distanceSquared > length * length) return false; // 超出最大距离

        // 计算点与扇形方向的夹角
        const pointDir = Vector3Utils.scale(pointToStart, 1 / Math.sqrt(distanceSquared));
        const cosTheta = Vector3Utils.dot(pointDir, dirNormalized);
        const halfAngle = angle / 2;

        return cosTheta >= Math.cos(halfAngle);
    }

    static rect(
        point: Vector3,
        startPoint: Vector3,
        direction: Vector3,
        leftToRightLength: number,
        upToDownLength: number,
        backToFrontLength: number
    ): boolean {
        // 首先检查高度
        if (Math.abs(point.y - startPoint.y) > upToDownLength / 2) {
            return false;
        }

        // 计算局部坐标系
        const dirNormalized = Vector3Utils.normalize(direction);
        const right = Vector3Utils.normalize(Vector3Utils.cross(dirNormalized, { x: 0, y: 1, z: 0 }));
        const forward = dirNormalized;

        // 计算点相对于矩形中心的偏移
        const offset = Vector3Utils.subtract(point, startPoint);
        offset.y = 0; // 忽略Y轴，因为高度已经单独检查

        // 计算在各轴上的投影
        const rightProjection = Vector3Utils.dot(offset, right);
        const forwardProjection = Vector3Utils.dot(offset, forward);

        // 检查是否在矩形范围内
        return Math.abs(rightProjection) <= leftToRightLength / 2 && forwardProjection <= backToFrontLength && forwardProjection > 0;
    }

    static unit(direction: Vector3, scale: number = 1): Vector3 {
        const magnitude = Vector3Utils.magnitude(direction)
        if (magnitude === 0) {
            return { x: 0, y: 0, z: 0 }
        }
        return Vector3Utils.scale(Vector3Utils.normalize(direction), scale);
    }

    static LOCATION: Vector3
    static DIRECTION: Vector3

    static locStart(start: Vector3, direction: Vector3) {
        this.LOCATION = { ...start }
        this.DIRECTION = { ...direction }
        return VecUtils
    }

    static start(target: Entity | Vector3) {
        if ('location' in target && 'getViewDirection' in target) {
            // 传入的是 Entity
            this.LOCATION = { ...target.location }
            this.DIRECTION = { ...target.getViewDirection() }
        } else {
            // 传入的是 Vector3
            this.LOCATION = { ...target as Vector3 }
            this.DIRECTION = { x: 0, y: 0, z: 0 }
        }
        return VecUtils
    }

    static end() {
        return this.LOCATION
    }

    static moveX(x: number) {
        this.LOCATION = Vector3Utils.add(this.LOCATION, { x: x, y: 0, z: 0 })
        return VecUtils
    }

    static moveY(y: number) {
        this.LOCATION = Vector3Utils.add(this.LOCATION, { x: 0, y: y, z: 0 })
        return VecUtils
    }

    static moveZ(z: number) {
        this.LOCATION = Vector3Utils.add(this.LOCATION, { x: 0, y: 0, z: z })
        return VecUtils
    }

    static moveL(dist: number) {
        const hori = VecUtils.unit(VecUtils.hori(this.DIRECTION))
        this.LOCATION = Vector3Utils.add(this.LOCATION, Vector3Utils.scale(VecUtils.rotate(hori, Math.PI / 2, 0), dist))
        return VecUtils
    }

    static moveR(dist: number) {
        const hori = VecUtils.unit(VecUtils.hori(this.DIRECTION))
        this.LOCATION = Vector3Utils.add(this.LOCATION, Vector3Utils.scale(VecUtils.rotate(hori, -Math.PI / 2, 0), dist))
        return VecUtils
    }

    static moveF(dist: number) {
        const hori = VecUtils.unit(VecUtils.hori(this.DIRECTION))
        this.LOCATION = Vector3Utils.add(this.LOCATION, Vector3Utils.scale(hori, dist))
        return VecUtils
    }

    static moveB(dist: number) {
        const hori = VecUtils.unit(VecUtils.hori(this.DIRECTION))
        this.LOCATION = Vector3Utils.add(this.LOCATION, Vector3Utils.scale(hori, -dist))
        return VecUtils
    }

    static hori(vector: Vector3) {
        return { ...vector, y: 0 }
    }

    static moveHori(position: Vector3, direction: Vector3, length: number): Vector3 {
        // 获取方向的水平分量(将Y分量设为0)
        const horizontalDir = { x: direction.x, y: 0, z: direction.z };

        // 如果水平分量为零向量，则无法移动
        if (Vector3Utils.magnitude(horizontalDir) === 0) {
            return { ...position }; // 返回原始坐标的副本
        }

        // 规范化水平方向向量
        const normalizedHorizontalDir = Vector3Utils.normalize(horizontalDir);
        // 计算水平位移向量
        const displacement = Vector3Utils.scale(normalizedHorizontalDir, length);
        // 返回新坐标
        return Vector3Utils.add(position, displacement);
    }

    static rotate(
        direction: Vector3,
        horizontalAngle: number,
        verticalAngle: number
    ): Vector3 {
        // 先水平旋转(Y轴旋转)
        let rotated = Vector3Utils.rotateY(direction, horizontalAngle);

        // 计算垂直于Y轴的平面内的旋转轴
        const right = Vector3Utils.normalize(Vector3Utils.cross(rotated, { x: 0, y: 1, z: 0 }));

        // 如果没有有效的右向量(比如原始方向就是垂直的)，使用X轴作为旋转轴
        if (Vector3Utils.magnitude(right) === 0) {
            rotated = Vector3Utils.rotateX(rotated, verticalAngle);
        } else {
            // 使用四元数旋转进行垂直旋转
            const cosHalfAngle = Math.cos(verticalAngle / 2);
            const sinHalfAngle = Math.sin(verticalAngle / 2);

            const q = {
                x: right.x * sinHalfAngle,
                y: right.y * sinHalfAngle,
                z: right.z * sinHalfAngle,
                w: cosHalfAngle
            };

            rotated = this.quaternionRotate(rotated, q);
        }

        return rotated;
    }

    private static quaternionRotate(v: Vector3, q: { x: number, y: number, z: number, w: number }): Vector3 {
        // 提取向量部分和标量部分
        const u = { x: q.x, y: q.y, z: q.z };
        const s = q.w;

        // 第一项: 2.0 * dot(u, v) * u
        const dotUV = Vector3Utils.dot(u, v);
        const term1 = Vector3Utils.scale(u, 2.0 * dotUV);

        // 第二项: (s*s - dot(u, u)) * v
        const term2 = Vector3Utils.scale(v, s * s - Vector3Utils.dot(u, u));

        // 第三项: 2.0 * s * cross(u, v)
        const crossUV = Vector3Utils.cross(u, v);
        const term3 = Vector3Utils.scale(crossUV, 2.0 * s);

        // 合并结果
        return Vector3Utils.add(term1, Vector3Utils.add(term2, term3));
    }
}

export class TimeUtils {
    static ticks(start: number, step: number, length: number) {
        return Array.from({ length }, (_, i) => start + i * step);
    }

    static timeout(callback: () => void, tick: number, trycatch: boolean = false) {
        if (tick === 0) {
            callback()
            return TimeUtils
        }
        if (trycatch) {
            try { system.runTimeout(callback, tick) } catch { }
        } else system.runTimeout(callback, tick)
        return TimeUtils
    }

    static timeseries<T>(
        callback: (param: T | undefined, index: number) => void,
        ticks: number[],
        params: (T | undefined)[] = [],
        stop: () => boolean = () => false,
        trycatch: boolean = false
    ) {
        if (params.length < ticks.length)
            params = ticks.map((_, i) => i < params.length ? params[i] : undefined)

        let stopMark: boolean = false
        ticks.forEach((tick, index) => {
            system.runTimeout(() => {
                if (stopMark) return
                if (stop()) { stopMark = true; return }
                if (trycatch) {
                    try { callback(params[index], index) } catch { }
                } else callback(params[index], index)
            }, tick)
        })
        return TimeUtils
    }
}

export class EntityUtils {
    static ENTITIES: Entity[]
    static entities(entity: Entity, maxDist: number = 64) {
        if (!entity.isValid()) this.ENTITIES = []
        else this.ENTITIES = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: maxDist,
            excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
            excludeFamilies: ["projectile", "dummy"],
        }).filter(e => e.id !== entity.id)
        return EntityUtils
    }

    static get() {
        return this.ENTITIES
    }

    static filter(filter: (e: Entity) => boolean) {
        this.ENTITIES = this.ENTITIES.filter(filter)
        return EntityUtils
    }

    static foreach(callback: (e: Entity) => void) {
        this.ENTITIES.forEach(callback)
        return EntityUtils
    }

    static enumerate(entities: Entity | Entity[]) {
        if (entities instanceof Entity)
            this.ENTITIES = [entities]
        else
            this.ENTITIES = entities
        return EntityUtils
    }

    static sphere(startPoint: Vector3, radius: number) {
        this.ENTITIES = this.ENTITIES.filter(e => VecUtils.sphere(e.location, startPoint, radius))
        return EntityUtils
    }

    static cylinder(startPoint: Vector3, direction: Vector3, radius: number, length: number) {
        this.ENTITIES = this.ENTITIES.filter(e => VecUtils.cylinder(e.location, startPoint, direction, radius, length))
        return EntityUtils
    }

    static cone(startPoint: Vector3, direction: Vector3, angle: number, length: number) {
        this.ENTITIES = this.ENTITIES.filter(e => VecUtils.cone(e.location, startPoint, direction, angle, length))
        return EntityUtils
    }

    static sector(startPoint: Vector3, direction: Vector3, height: number, angle: number, length: number) {
        this.ENTITIES = this.ENTITIES.filter(e => VecUtils.sector(e.location, startPoint, direction, height, angle, length))
        return EntityUtils
    }

    static rect(startPoint: Vector3, direction: Vector3, leftToRightLength: number, upToDownLength: number, backToFrontLength: number) {
        this.ENTITIES = this.ENTITIES.filter(e => VecUtils.rect(e.location, startPoint, direction, leftToRightLength, upToDownLength, backToFrontLength))
        return EntityUtils
    }

    static damage(amount: number) {
        this.ENTITIES.forEach(target => target.isValid() && target.applyDamage(amount))
        return EntityUtils
    }

    static effect(effect: string, ticks: number, options?: EntityEffectOptions) {
        this.ENTITIES.forEach(target => target.isValid() && target.addEffect(effect, ticks, options))
        return EntityUtils
    }

    static setOnFire(seconds: number, useEffects?: boolean) {
        this.ENTITIES.forEach(target => target.setOnFire(seconds, useEffects))
        return EntityUtils
    }

    static setDP(k: string, v: any) {
        this.ENTITIES.forEach(target => target.isValid() && DPUtils.set(target, k, v))
        return EntityUtils
    }

    static knockbackBaseView(entity: Entity, hori: number, vert: number) {
        if (!entity.isValid()) return EntityUtils
        this.ENTITIES.forEach(target => target.applyKnockback(entity.getViewDirection().x, entity.getViewDirection().z, hori, vert))
        return EntityUtils
    }

    static knockbackBaseDiff(location: Entity | Vector3, direction: "intro" | "outro", hori: number, vert: number) {
        if (location instanceof Entity)
            location = location.location
        this.ENTITIES.forEach(target => {
            if (!target.isValid()) return
            const locDiff =
                direction === "outro" ?
                    Vector3Utils.subtract(target.location, location) :
                    Vector3Utils.subtract(location, target.location)
            target.applyKnockback(locDiff.x, locDiff.z, hori, vert)
        })
        return EntityUtils
    }

    static knockbackBaseFYR(entity: Entity, f: number, y: number, r: number){
        if (!entity.isValid()) return EntityUtils
        this.ENTITIES.forEach(target=>{
            const x = entity.getViewDirection().x
            const z = entity.getViewDirection().z
            target.applyKnockback(x*f+z*r, z*f-x*r,f,y)
        })
        return EntityUtils
    }

    static projectile(owner: Entity, typeId: string, location: Vector3, velocity: Vector3) {
        const proj = owner.dimension.spawnEntity(typeId, location)
        const projComp = proj.getComponent(EntityProjectileComponent.componentId) as EntityProjectileComponent
        projComp.owner = owner;
        projComp.shoot(velocity)
        return proj
    }
}

export class BlockUtils {
    // 方块硬度映射表
    static readonly BLOCK_HARDNESS: { [key: string]: number } = {
        "minecraft:air": 0,
        "minecraft:water": 0,
        "minecraft:lava": 0,
        "minecraft:grass_block": 0.6,
        "minecraft:dirt": 0.5,
        "minecraft:sand": 0.5,
        "minecraft:gravel": 0.6,
        "minecraft:stone": 1.5,
        "minecraft:cobblestone": 2.0,
        "minecraft:wood": 2.0,
        "minecraft:planks": 2.0,
        "minecraft:glass": 0.3,
        "minecraft:iron_ore": 3.0,
        "minecraft:gold_ore": 3.0,
        "minecraft:diamond_ore": 3.0,
        "minecraft:iron_block": 5.0,
        "minecraft:gold_block": 3.0,
        "minecraft:diamond_block": 5.0,
        "minecraft:obsidian": 50.0,
        "minecraft:bedrock": 3600000.0,
        "minecraft:netherrack": 0.4,
        "minecraft:end_stone": 3.0,
        "minecraft:deepslate": 3.0,
        "minecraft:tuff": 1.5,
        "minecraft:blackstone": 1.5,
        "minecraft:basalt": 1.25,
        "minecraft:concrete": 1.8,
        "minecraft:terracotta": 1.25,
        "minecraft:bricks": 2.0,
        "minecraft:nether_bricks": 2.0,
        "minecraft:quartz_block": 0.8,
        "minecraft:sandstone": 0.8,
        "minecraft:red_sandstone": 0.8,
        "minecraft:prismarine": 1.5,
        "minecraft:purpur_block": 1.5,
        "minecraft:coal_ore": 3.0,
        "minecraft:redstone_ore": 3.0,
        "minecraft:lapis_ore": 3.0,
        "minecraft:emerald_ore": 3.0,
        "minecraft:copper_ore": 3.0,
        "minecraft:ancient_debris": 30.0
    };

    // 获取方块硬度
    static getBlockHardness(blockTypeId: string): number {
        // 移除命名空间前缀进行匹配
        const normalizedId = blockTypeId.includes(':') ? blockTypeId : `minecraft:${blockTypeId}`;
        
        // 精确匹配
        if (this.BLOCK_HARDNESS[normalizedId] !== undefined) {
            return this.BLOCK_HARDNESS[normalizedId];
        }
        
        // 模糊匹配常见类型
        const baseId = normalizedId.split(':')[1];
        
        if (baseId.includes('ore')) return 3.0;
        if (baseId.includes('stone')) return 1.5;
        if (baseId.includes('wood') || baseId.includes('log') || baseId.includes('planks')) return 2.0;
        if (baseId.includes('glass')) return 0.3;
        if (baseId.includes('wool') || baseId.includes('carpet')) return 0.8;
        if (baseId.includes('concrete')) return 1.8;
        if (baseId.includes('terracotta')) return 1.25;
        if (baseId.includes('brick')) return 2.0;
        if (baseId.includes('sand')) return 0.5;
        if (baseId.includes('dirt') || baseId.includes('grass')) return 0.5;
        if (baseId.includes('leaves')) return 0.2;
        if (baseId.includes('flower') || baseId.includes('plant')) return 0.0;
        
        // 默认硬度
        return 1.0;
    }

    // 检查方块是否可破坏
    static isDestructible(blockTypeId: string): boolean {
        const hardness = this.getBlockHardness(blockTypeId);
        return hardness < 3600000.0 && blockTypeId !== "minecraft:bedrock";
    }

    // 计算爆炸强度衰减
    static calculateExplosionIntensity(
        distance: number, 
        baseIntensity: number, 
        falloffType: "linear" | "quadratic" | "cubic" = "quadratic"
    ): number {
        if (distance <= 0) return baseIntensity;
        
        switch (falloffType) {
            case "linear":
                return Math.max(0, baseIntensity * (1 - distance / baseIntensity));
            case "quadratic":
                return Math.max(0, baseIntensity / (1 + distance * distance));
            case "cubic":
                return Math.max(0, baseIntensity / (1 + distance * distance * distance));
            default:
                return Math.max(0, baseIntensity / (1 + distance * distance));
        }
    }

    // 球形爆炸
    static sphereExplosion(
        dimension: Dimension, 
        center: Vector3, 
        radius: number, 
        intensity: number = 10.0,
        options: {
            respectHardness?: boolean;
            falloffType?: "linear" | "quadratic" | "cubic";
            dropItems?: boolean;
            damageEntities?: boolean;
            entityDamage?: number;
        } = {}
    ) {
        const {
            respectHardness,
            falloffType,
            dropItems,
        } = options;

        const destroyedBlocks: Vector3[] = [];
        const centerFloor = {
            x: Math.floor(center.x),
            y: Math.floor(center.y),
            z: Math.floor(center.z)
        };

        // 遍历爆炸范围内的所有方块
        for (let x = centerFloor.x - Math.ceil(radius); x <= centerFloor.x + Math.ceil(radius); x++) {
            for (let y = Math.max(centerFloor.y - Math.ceil(radius), -64); y <= centerFloor.y + Math.ceil(radius); y++) {
                for (let z = centerFloor.z - Math.ceil(radius); z <= centerFloor.z + Math.ceil(radius); z++) {
                    const blockPos = { x, y, z };
                    const distance = Vector3Utils.distance(blockPos, center);
                    
                    if (distance <= radius) {
                        const block = dimension.getBlock(blockPos);
                        if (!block) continue;
                        
                        const blockTypeId = block.typeId;
                        if (!this.isDestructible(blockTypeId)) continue;
                        
                        const explosionIntensity = this.calculateExplosionIntensity(distance, intensity, falloffType);
                        const blockHardness = respectHardness ? this.getBlockHardness(blockTypeId) : 1.0;
                        
                        // 计算破坏概率
                        const destructionChance = Math.min(1.0, explosionIntensity / blockHardness);
                        
                        if (Math.random() < destructionChance) {
                            // 掉落物品
                            if (dropItems && blockTypeId !== "minecraft:air") {
                                try {
                                    dimension.runCommand(`loot spawn ${x} ${y} ${z} loot "${blockTypeId}"`);
                                } catch (e) {
                                    // 如果没有对应的战利品表，直接掉落方块
                                    try {
                                        dimension.spawnItem(new ItemStack(blockTypeId, 1), blockPos);
                                    } catch (e2) {}
                                }
                            }
                            
                            // 破坏方块
                            block.setType("minecraft:air");
                            destroyedBlocks.push(blockPos);
                        }
                    }
                }
            }
        }

        return destroyedBlocks;
    }

}


export class NavUtils {
    static PATH: { loc: Vector3, ticks: number }[] = []

    static interpolateVectors(start: Vector3, end: Vector3, segments: number): Vector3[] {
        if (segments <= 0 || !Number.isInteger(segments)) {
            throw new Error("Segments must be a positive integer");
        }

        const points: Vector3[] = [];

        // 包括起点和终点，所以总点数是 segments + 1
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            points.push({
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t,
                z: start.z + (end.z - start.z) * t
            });
        }

        return points;
    }

    static rotation(start: Vector3, end: Vector3) {
        const diff = Vector3Utils.subtract(end, start)
        const horiMagnitude = Vector3Utils.magnitude({ ...diff, y: 0 })

        // 防止除零错误
        const x = diff.x === 0 ? 0 : MathUtils.tanToDegrees(diff.z / diff.x)
        const y = horiMagnitude === 0 ? 0 : MathUtils.tanToDegrees(diff.y / horiMagnitude)

        return { x, y }
    }

    static start() {
        this.PATH = []
        return NavUtils
    }

    static mark(loc: Vector3, ticks: number) {
        this.PATH.push({ loc, ticks })
        return NavUtils
    }

    static end(entity: Entity, stop: (entity: Entity) => boolean = () => false) {
        entity.runCommand("say PATH " + JSON.stringify(this.PATH))
        if (this.PATH.length === 0) return
        const path = [{ loc: entity.location, ticks: 0 }, ...this.PATH]
        let series: Vector3[] = []
        for (let i = 0; i < path.length - 1; i++) {
            const curr = path[i]
            const next = path[i + 1]
            series = series.concat(this.interpolateVectors(curr.loc, next.loc, next.ticks))
        }
        let stopMark: boolean = false
        TimeUtils.timeseries((idx) => {
            if (stopMark) return
            if (stop(entity)) { stopMark = true; return }
            try { entity.teleport(series[idx! - 1], { facingLocation: series[idx!] }) } catch { }
        }, TimeUtils.ticks(1, 1, series.length), TimeUtils.ticks(1, 1, series.length - 1))
    }
}

export class InventoryUtils {

    static TARGET: Player | undefined = undefined
    static CONTAINER: Container | undefined = undefined

    static container(target: Entity | Block) {
        if (target instanceof Entity) {
            this.CONTAINER = (target.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container
            if (target instanceof Player) this.TARGET = target
        } else {
            this.CONTAINER = (target.getComponent(BlockComponentTypes.Inventory) as BlockInventoryComponent).container
        }
        return InventoryUtils
    }

    // For Player Only
    static selected() {
        if (this.TARGET === undefined) return undefined;
        const selectedIndex = (this.TARGET as Player).selectedSlotIndex
        return this.CONTAINER?.getItem(selectedIndex)
    }

    static index(condition: (item: ItemStack | undefined) => boolean) {
        if (!this.CONTAINER) return -1
        for (let i = 0; i < this.CONTAINER.size; i++) {
            if (condition(this.CONTAINER.getItem(i))) return i
        }
        return -1
    }

    static set(condition: (item: ItemStack | undefined, idx: number) => boolean, item: ItemStack) {
        if (!this.CONTAINER) return
        for (let i = 0; i < this.CONTAINER.size; i++) {
            const curr = this.CONTAINER.getItem(i)
            if (condition(curr, i)) {
                this.CONTAINER.setItem(i, item)
            }
        }
    }
}

export class DPUtils {

    static STORE = {}

    static REGISTRATION: { [key: string]: ((target: Entity | ItemStack | World, curr: any, prev: any) => any)[] } = {}

    private static mapValues<T extends object, U>(obj: T, fn: (value: T[keyof T], key: keyof T) => U): Record<keyof T, U> {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, fn(value, key as keyof T)])
        ) as Record<keyof T, U>;
    }

    static store() {
        return this.mapValues(this.STORE, (v, k) => ({
            id: v,
            curr: (target: Entity | ItemStack | World, placeHolder?: any) => this.curr(target, k, placeHolder),
            prev: (target: Entity | ItemStack | World, placeHolder?: any) => this.prev(target, k, placeHolder),
            both: (target: Entity | ItemStack | World, placeHolder?: any) => this.both(target, k, placeHolder),
            set: (target: Entity | ItemStack | World, value: any, placeHolder?: any) => this.set(target, k, value, placeHolder),
            temp: (target: Entity | ItemStack | World, value: any, ticks: number) => this.temp(target, k, value, ticks),
            register: (callback: (target: Entity | ItemStack | World, curr: any, prev: any) => any) => this.register(k, callback),
        }))
    }

    static set(target: Entity | ItemStack | World, key: string, value: any, placeHolder?: any) {
        if (typeof value === "function")
            value = value(DPUtils.curr(target, key, placeHolder))
        const prev = this.curr(target, key, placeHolder)  // 获取解析后的之前值，保持类型一致
        target.setDynamicProperty(`${key}_prev`, target.getDynamicProperty(key))  // 保存原始值用于prev方法
        target.setDynamicProperty(key, JSON.stringify(value))

        if (key in this.REGISTRATION) {
            this.REGISTRATION[key].forEach(callback => callback(target, value, prev))
        }
    }

    static temp(target: Entity | ItemStack | World, key: string, value: any, ticks: number) {
        const prev = this.curr(target, key)
        this.set(target, key, value)
        TimeUtils.timeout(() => {
            this.set(target, key, prev)
        }, ticks, true)
        return DPUtils
    }

    static curr(target: Entity | ItemStack | World, key: string, placeHolder: any = undefined) {
        const raw = target.getDynamicProperty(key)
        if (raw === undefined) return placeHolder
        return JSON.parse(target.getDynamicProperty(key) as string)
    }

    static prev(target: Entity | ItemStack | World, key: string, placeHolder: any) {
        return this.curr(target, `${key}_prev`, placeHolder)
    }

    static both(target: Entity | ItemStack | World, key: string, placeHolder: any = undefined) {
        return {
            curr: this.curr(target, key, placeHolder),
            prev: this.prev(target, key, placeHolder),
        }
    }

    static register(key: string, callback: (target: Entity | ItemStack | World, curr: any, prev: any) => any) {
        if (key in this.REGISTRATION) {
            this.REGISTRATION[key].push(callback)
        } else {
            this.REGISTRATION[key] = [callback]
        }
        return DPUtils
    }

    static sync(target: Entity | ItemStack | World, key: string) {
        target.setDynamicProperty(`${key}_prev`, target.getDynamicProperty(key))
    }
}


export class MenuUtils {

    static MENU_DATA: any = { buttons: [], title: "" }

    static title(title: string) {
        this.MENU_DATA.title = title
        return MenuUtils
    }

    static button(key: string, callback: () => void) {
        this.MENU_DATA.buttons.push({ key, callback })
        return MenuUtils
    }

    static show(player: Player) {
        const menu = new ActionFormData()
        menu.title(this.MENU_DATA.title)
        this.MENU_DATA.buttons.forEach((button: any) => {
            menu.button(button.key)
        })
        menu.show(player).then(({ selection }) => {
            if (selection === undefined) return
            this.MENU_DATA.buttons[selection].callback()
        })
        this.MENU_DATA = { buttons: [], title: "" }
    }
}