import { Vector3 } from "@minecraft/server";

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