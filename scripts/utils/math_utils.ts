import { Vector3Utils } from "@minecraft/math";
import { Dimension, Entity, system, Vector3, world } from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";


export class MathUtils {
    static valueMap(state: any, from: any[], to: any[]): any {
        return to[from.indexOf(state)]
    }


    static randomInt(from: number, to: number) {
        return Math.floor(Math.random() * (to - from)) + from
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

    static multiply(arr: number[]) {
        return arr.reduce((acc, curr) => acc * curr, 1)
    }
    static square(vector: Vector3) {
        return vector.x ** 2 + vector.y ** 2 + vector.z ** 2
    }

    static distanceSquared(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }

    static yaw(x: number, z: number) {
        // 计算弧度
        const yawRad = Math.atan2(-x, z);
        // 转换为角度
        let yawDeg = (yawRad * 180) / Math.PI;
        // 规范化到[-180°, 180°]
        yawDeg = ((yawDeg % 360) + 360) % 360; // 转正数范围[0°, 360°)
        if (yawDeg > 180) yawDeg -= 360; // 转回[-180°, 180°]
        return yawDeg;
    };
}

/**
 * 几何检测工具类 - 专门负责各种几何形状的点位检测
 */
export class GeometryUtils {
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

    static cuboid(point: Vector3, startPoint: Vector3, width: number, height: number): boolean {
        return Math.abs(point.x - startPoint.x) <= width / 2 && Math.abs(point.z - startPoint.z) <= width / 2 && Math.abs(point.y - startPoint.y) <= height / 2
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
}

/**
 * 向量工具类 - 专门负责向量计算和链式操作
 */
export class VecUtils {

    static unit(direction: Vector3, scale: number = 1): Vector3 {
        const magnitude = Vector3Utils.magnitude(direction)
        if (magnitude === 0) {
            return { x: 0, y: 0, z: 0 }
        }
        return Vector3Utils.scale(Vector3Utils.normalize(direction), scale);
    }

    static ENTITY: Entity
    static DIMENSION: Dimension
    static LOCATION: Vector3
    static DIRECTION: Vector3

    static start(target: Entity | Vector3, direction?: Vector3, dimension?: MinecraftDimensionTypes, velocityMode?: boolean) {
        if ('location' in target && 'getViewDirection' in target) {
            // 传入的是 Entity
            this.ENTITY = target
            this.DIMENSION = target.dimension
            this.LOCATION = { ...target.location }
            this.DIRECTION = velocityMode ? { ...VecUtils.unit(target.getVelocity()) } : { ...target.getViewDirection() }
        } else {
            // 传入的是 Vector3
            this.DIMENSION = dimension ? world.getDimension(dimension) : world.getDimension(MinecraftDimensionTypes.Overworld)
            this.LOCATION = { ...target as Vector3 }
            this.DIRECTION = direction ? { ...direction } : { x: 0, y: 0, z: 0 }
        }
        return VecUtils
    }

    static end() {
        return this.LOCATION
    }

    static moveLocation(location: Vector3) {
        this.LOCATION = location
        return VecUtils
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

    static moveR(dist: number) {
        const hori = VecUtils.unit(VecUtils.hori(this.DIRECTION))
        this.LOCATION = Vector3Utils.add(this.LOCATION, Vector3Utils.scale({ x: hori.z, z: -hori.x, y: 0 }, dist))
        return VecUtils
    }

    static moveF(dist: number) {
        const hori = VecUtils.unit(VecUtils.hori(this.DIRECTION))
        this.LOCATION = Vector3Utils.add(this.LOCATION, Vector3Utils.scale(hori, dist))
        return VecUtils
    }

    static moveFYR(entity: Entity, fyr: number[], moveYToBlock: boolean = false){
        const res = VecUtils.start(entity).moveF(fyr[0] ?? 0).moveY(fyr[1] ?? 0).moveR(fyr[2] ?? 0).end()
        if (moveYToBlock) return VecUtils.moveYToBlock().end()
        return res
    }

    static moveView(dist: number) {
        this.LOCATION = Vector3Utils.add(this.LOCATION, Vector3Utils.scale(this.DIRECTION, dist))
        return VecUtils
    }

    static moveToBlock(maxDist: number) {
        const targetBlock = this.ENTITY.getBlockFromViewDirection()
        if (!targetBlock) {
            this.LOCATION = Vector3Utils.add(this.ENTITY.location, Vector3Utils.scale(this.ENTITY.getViewDirection(), maxDist))
            return VecUtils
        }
        this.LOCATION = targetBlock.faceLocation
        return VecUtils
    }

    static moveYToBlock(downOffset: number = 5, upOffset: number = 5){
        for (let i = - upOffset; i < downOffset; i++) {
            const block = this.DIMENSION.getBlock(Vector3Utils.add(this.LOCATION, {y: -i}))
            if (block?.isAir) continue
            this.LOCATION = Vector3Utils.add(this.LOCATION, {y: -i+1})
            break
        }
        return VecUtils
    }

    static moveToEntity(maxDist: number) {
        const targetEntities = this.ENTITY.getEntitiesFromViewDirection()
        if (targetEntities.length === 0) {
            this.LOCATION = Vector3Utils.add(this.ENTITY.location, Vector3Utils.scale(this.ENTITY.getViewDirection(), maxDist))
            return VecUtils
        }
        const targetEntity = targetEntities[0]
        this.LOCATION = targetEntity.entity.location
        return VecUtils
    }

    static hori(vector: Vector3) {
        return { ...vector, y: 0 }
    }
}