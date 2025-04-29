import { Vector3Utils } from "@minecraft/math";
import { Entity, system, Vector3 } from "@minecraft/server";


export class Vec {

    static entities(entity: Entity, filter: (entity: Entity)=>boolean, maxDist: number = 64){
        return entity.dimension.getEntities({
            location: entity.location,
            maxDistance: maxDist
        }).filter(e=>filter(e))
    }

    /**
     * 1. 判断一个位置是否在一个球形区域内
     * @param point 要检测的点
     * @param startPoint 球心
     * @param radius 球半径
     * @returns 是否在球内
     */
    static sphere(point: Vector3, startPoint: Vector3, radius: number): boolean {
        return Vector3Utils.distance(point, startPoint) < radius
    }

    /**
     * 2. 判断一个位置是否在一个圆柱形区域内
     * @param point 要检测的点
     * @param startPoint 圆柱起点
     * @param direction 圆柱方向
     * @param radius 圆柱半径
     * @returns 是否在圆柱内
     */
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

    /**
     * 3. 判断一个位置是否在一个锥形区域内
     * @param point 要检测的点
     * @param startPoint 锥顶点
     * @param direction 锥方向
     * @param angle 锥角(弧度)
     * @param length 锥长度(最大距离)
     * @returns 是否在锥内
     */
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

    /**
     * 4. 判断一个位置是否在一个高度固定的扇形区域内
     * @param point 要检测的点
     * @param startPoint 扇形起点
     * @param direction 扇形方向
     * @param height 扇形高度
     * @param angle 扇形角度(弧度)
     * @param length 扇形半径(最大距离)
     * @returns 是否在扇形内
     */
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

    /**
     * 5. 判断一个位置是否在高度固定的水平的矩形区域内
     * @param point 要检测的点
     * @param startPoint 矩形起点
     * @param direction 矩形方向
     * @param leftToRightLength 左右长度
     * @param upToDownLength 上下长度
     * @param backToFrontLength 前后长度
     * @returns 是否在矩形内
     */
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
        return Math.abs(rightProjection) <= leftToRightLength / 2 && 
               Math.abs(forwardProjection) <= backToFrontLength / 2;
    }

    /**
     * 6. 给定一个方向向量、水平旋转角度和垂直旋转角度，返回旋转后的向量
     * @param direction 原始方向向量
     * @param hori 水平旋转角度(弧度)
     * @param vert 垂直旋转角度(弧度)
     * @returns 旋转后的向量
     */
    static rotate(
        direction: Vector3,
        hori: number,
        vert: number
    ): Vector3 {
        // 先水平旋转(Y轴旋转)
        let rotated = Vector3Utils.rotateY(direction, hori);
        
        // 计算垂直于Y轴的平面内的旋转轴
        const right = Vector3Utils.normalize(Vector3Utils.cross(rotated, { x: 0, y: 1, z: 0 }));
        
        // 如果没有有效的右向量(比如原始方向就是垂直的)，使用X轴作为旋转轴
        if (Vector3Utils.magnitude(right) === 0) {
            rotated = Vector3Utils.rotateX(rotated, vert);
        } else {
            // 使用四元数旋转进行垂直旋转
            const cosHalfAngle = Math.cos(vert / 2);
            const sinHalfAngle = Math.sin(vert / 2);
            
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

    /**
     * 7. 给定一个方向向量，返回和它同向的单位向量
     * @param direction 方向向量
     * @returns 单位向量
     */
    static unit(direction: Vector3): Vector3 {
        return Vector3Utils.normalize(direction);
    }

    /**
     * 1. 给定一个坐标、一个方向和一个长度，返回坐标沿着该方向变化相应长度的新的坐标
     * @param position 原始坐标
     * @param direction 移动方向
     * @param length 移动长度
     * @returns 移动后的新坐标
     */
    static move(position: Vector3, direction: Vector3, length: number): Vector3 {
        // 规范化方向向量
        const normalizedDir = Vector3Utils.normalize(direction);
        // 计算位移向量
        const displacement = Vector3Utils.scale(normalizedDir, length);
        // 返回新坐标
        return Vector3Utils.add(position, displacement);
    }

    static horizontal(vector: Vector3){
        return {...vector, y:0}
    }

    /**
     * 2. 给定一个坐标、一个方向和一个长度，返回坐标沿着该方向的水平分量变化相应长度的新的坐标
     * @param position 原始坐标
     * @param direction 移动方向
     * @param length 移动长度
     * @returns 移动后的新坐标(仅水平移动)
     */
    static moveHorizontal(position: Vector3, direction: Vector3, length: number): Vector3 {
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

    /**
     * 辅助方法：使用四元数旋转向量
     * @param v 要旋转的向量
     * @param q 四元数 {x, y, z, w}
     * @returns 旋转后的向量
     */
    private static quaternionRotate(v: Vector3, q: {x: number, y: number, z: number, w: number}): Vector3 {
        // 提取向量部分和标量部分
        const u = {x: q.x, y: q.y, z: q.z};
        const s = q.w;
        
        // 第一项: 2.0 * dot(u, v) * u
        const dotUV = Vector3Utils.dot(u, v);
        const term1 = Vector3Utils.scale(u, 2.0 * dotUV);
        
        // 第二项: (s*s - dot(u, u)) * v
        const term2 = Vector3Utils.scale(v, s*s - Vector3Utils.dot(u, u));
        
        // 第三项: 2.0 * s * cross(u, v)
        const crossUV = Vector3Utils.cross(u, v);
        const term3 = Vector3Utils.scale(crossUV, 2.0 * s);
        
        // 合并结果
        return Vector3Utils.add(term1, Vector3Utils.add(term2, term3));
    }
}

export class TimeUtils {
    static generateTicks(start: number, step: number, length: number){
        return Array.from({ length }, (_, i) => start + i * step);
    }
    
    static timeseries<T>(callback: (param: T | undefined, index: number)=>void, ticks: number[], params: (T | undefined)[]=[]) {
        if (params.length < ticks.length) 
            params = ticks.map((_,i)=>i<params.length?params[i]:undefined)
        ticks.forEach((tick, index)=>{system.runTimeout(()=>callback(params[index], index), tick)})
    }
}