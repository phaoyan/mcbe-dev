import numpy as np
from noise_core import PerlinNoise, ValueNoise

def generate_octave_perlin(width, height, scale=50.0, octaves=4, persistence=0.5, lacunarity=2.0, seed=42):
    """生成八度 Perlin 噪声
    
    Molang Equivalent:
    t.scale = 50.0;
    t.octaves = 4;
    t.persistence = 0.5;
    t.lacunarity = 2.0;
    t.noise = 0;
    t.amp = 1;
    t.freq = 1.0 / t.scale;
    loop(t.octaves, {
        t.noise = t.noise + t.amp * query.noise(v.originx * t.freq, v.originz * t.freq);
        t.amp = t.amp * t.persistence;
        t.freq = t.freq * t.lacunarity;
    });
    t.noise = (t.noise + 1.0) / 2.0;
    t.noise_octave_perlin = t.noise;
    """
    perlin_generators = [PerlinNoise(seed + i) for i in range(int(octaves))]
    x = np.arange(width)
    y = np.arange(height)
    X, Y = np.meshgrid(x, y)
    noise_data = np.zeros((height, width))
    
    for octave in range(int(octaves)):
        freq = lacunarity ** octave
        amplitude = persistence ** octave
        perlin = perlin_generators[octave]
        
        # 计算该八度
        octave_noise = np.array([
            [perlin.noise(X[i, j] * freq / scale, Y[i, j] * freq / scale)
             for j in range(width)]
            for i in range(height)
        ])
        noise_data += octave_noise * amplitude
    
    return noise_data

def generate_value_noise(width, height, scale=20.0, octaves=1, seed=42):
    """生成 Value 噪声 (类似 Perlin 但更块状/平滑)
    
    Molang Equivalent (Approximated with Perlin):
    t.scale = 20.0;
    t.octaves = 1;
    t.noise = 0;
    t.amp = 1;
    t.freq = 1.0 / t.scale;
    t.persistence = 0.5; t.lacunarity = 2.0;
    loop(t.octaves, {
        t.noise = t.noise + t.amp * query.noise(v.originx * t.freq, v.originz * t.freq);
        t.amp = t.amp * t.persistence;
        t.freq = t.freq * t.lacunarity;
    });
    t.noise = (t.noise + 1.0) / 2.0;
    t.noise_value = t.noise;
    """
    generators = [ValueNoise(seed + i * 100) for i in range(int(octaves))]
    x = np.arange(width)
    y = np.arange(height)
    X, Y = np.meshgrid(x, y)
    noise_data = np.zeros((height, width))
    
    lacunarity = 2.0
    persistence = 0.5
    
    for octave in range(int(octaves)):
        freq = lacunarity ** octave
        amplitude = persistence ** octave
        gen = generators[octave]
        
        layer_data = np.array([
            [gen.noise(X[i,j] / scale * freq, Y[i,j] / scale * freq) 
             for j in range(width)]
            for i in range(height)
        ])
        noise_data += layer_data * amplitude

    return noise_data

def generate_white_noise(width, height, intensity=1.0, threshold=0.0, seed=42):
    """生成白噪声
    
    Molang Equivalent:
    t.intensity = 1.0;
    t.threshold = 0.0;
    t.hash = math.abs(math.mod(math.sin(v.originx * 12.9898 + v.originz * 78.233) * 43758.5453, 1));
    t.noise = (t.hash > t.threshold) ? t.hash * t.intensity : 0;
    t.noise_white = t.noise;
    """
    np.random.seed(seed)
    noise = np.random.rand(height, width)
    # 简单的阈值处理
    if threshold > 0:
        noise = np.where(noise > threshold, noise, 0)
    return noise * intensity

def generate_checkerboard(width, height, size=32.0, seed=42):
    """生成棋盘格 (用于测试)
    
    Molang Equivalent:
    t.size = 32.0;
    t.check = math.mod(math.floor(v.originx / t.size) + math.floor(v.originz / t.size), 2);
    t.noise_checkerboard = t.check;
    """
    x = np.arange(width)
    y = np.arange(height)
    X, Y = np.meshgrid(x, y)
    # 简单的异或模式
    return ((X // int(size)) % 2) ^ ((Y // int(size)) % 2)



def generate_center_noise(
    width,
    height,
    scale=50.0,
    octaves=4,
    persistence=0.5,
    lacunarity=2.0,
    center_spread=1.0,
    center_strength=1.0,
    seed=42,
    base_normalize=True,
    roughness=1.0,
    center_floor=0.0,
    **kwargs
):
    """生成带中心的 Perlin 噪声（中心梯度 + Perlin 起伏）

    直观效果：越接近中心，基础高度越高；并叠加 Perlin 起伏。

    // Parameters
    t.scale = 50.0;
    t.octaves = 4;
    t.persistence = 0.5;
    t.lacunarity = 2.0;
    t.island_spread = 1.0;
    t.center_strength = 2.0;
    t.satellite_spread = 0.6;
    t.satellite_strength = 1.5;
    t.satellite_distance = 0.7;
    
    t.center_x = (q.noise(51454, 31916) + 1) * 256;
    t.center_z = (q.noise(13122, 15958) + 1) * 256;
    t.base_radius = 64.0;

    // 1. Base Noise
    t.noise = 0; t.amp = 1; t.freq = 1.0 / t.scale;
    loop(t.octaves, {
        t.noise = t.noise + t.amp * query.noise(v.originx * t.freq, v.originz * t.freq);
        t.amp = t.amp * t.persistence; t.freq = t.freq * t.lacunarity;
    });
    
    t.noise = (t.noise + 1.0) / 2.0;
    
    // 2. Center Gradient
    t.spread_sq = math.pow(t.island_spread * t.base_radius, 2);
    
    // Use squared distance to avoid sqrt: 1 - (d/r)^2 = 1 - (d^2 / r^2)
    t.dx = v.originx - t.center_x;
    t.dz = v.originz - t.center_z;
    t.dist_sq_center = t.dx * t.dx + t.dz * t.dz;
    t.g_center = math.clamp(1.0 - t.dist_sq_center / t.spread_sq, 0, 1) * t.center_strength;
    
    t.grad = t.g_center;
    t.noise_center = math.clamp((t.noise + t.grad) / (1.0 + t.center_strength), 0, 1);

    """
    # 兼容外部传入的多余参数（例如 UI 统一下发）
    _ = kwargs

    EPS = 1e-9

    np.random.seed(seed)

    # 1) 基础 Perlin（八度叠加）
    noise_base = generate_octave_perlin(width, height, scale, octaves, persistence, lacunarity, seed)
    if base_normalize:
        # 依据八度振幅总和，将噪声近似归一化到 [0, 1]
        amp_sum = float(np.sum([persistence ** o for o in range(int(octaves))]))
        if amp_sum <= EPS:
            amp_sum = 1.0
        noise_base = noise_base / amp_sum
        noise_base = (noise_base + 1.0) * 0.5
        noise_base = np.clip(noise_base, 0.0, 1.0)

    # 2) 中心梯度（坐标归一化到 [-1, 1]）
    x = np.linspace(-1, 1, width)
    y = np.linspace(-1, 1, height)
    X, Y = np.meshgrid(x, y)

    dist_center = np.sqrt(X**2 + Y**2)
    spread = max(float(center_spread), EPS)
    grad_center = 1.0 - (dist_center / spread) ** 2
    grad_center = np.clip(grad_center, 0.0, 1.0) * float(center_strength)

    # 3) 混合（roughness 控制基础噪声起伏强度）
    if base_normalize:
        base_term = (noise_base - 0.5) * float(roughness)
    else:
        base_term = noise_base * float(roughness)

    final_terrain = grad_center + base_term

    # 4) 可选：中心最低高度钳制，避免中心被 Perlin 拉成“坑”
    if center_floor is not None and float(center_floor) > 0:
        denom = max(float(center_strength), EPS)
        floor_mask = np.clip(grad_center / denom, 0.0, 1.0)
        floor_min = float(center_floor) * float(center_strength) * floor_mask
        final_terrain = np.maximum(final_terrain, floor_min)

    return final_terrain


def generate_island_noise(width, height, scale=50.0, octaves=4, persistence=0.5, lacunarity=2.0,
                          island_spread=1.0, center_strength=2.0,
                          satellite_spread=0.6, satellite_strength=1.5, satellite_distance=0.7, seed=42,
                          base_normalize=True, roughness=1.0, center_floor=0.35, **kwargs):
    """生成中心岛屿+卫星岛地形 (多点引力模型)
    
    Molang Equivalent:
    // Parameters
    t.scale = 50.0;
    t.octaves = 4;
    t.persistence = 0.5;
    t.lacunarity = 2.0;
    t.island_spread = 1.0;
    t.center_strength = 2.0;
    t.satellite_spread = 0.6;
    t.satellite_strength = 1.5;
    t.satellite_distance = 0.7;
    
    t.center_x = (q.noise(51454, 31916) + 1) * 256;
    t.center_z = (q.noise(13122, 15958) + 1) * 256;
    t.base_radius = 64.0;

    // 1. Base Noise
    t.noise = 0; t.amp = 1; t.freq = 1.0 / t.scale;
    loop(t.octaves, {
        t.noise = t.noise + t.amp * query.noise(v.originx * t.freq, v.originz * t.freq);
        t.amp = t.amp * t.persistence; t.freq = t.freq * t.lacunarity;
    });
    
    t.noise = (t.noise + 1.0) / 2.0;
    
    // 2. Center Gradient
    t.spread_sq = math.pow(t.island_spread * t.base_radius, 2);
    
    // Use squared distance to avoid sqrt: 1 - (d/r)^2 = 1 - (d^2 / r^2)
    t.dx = v.originx - t.center_x;
    t.dz = v.originz - t.center_z;
    t.dist_sq_center = t.dx * t.dx + t.dz * t.dz;
    t.g_center = math.clamp(1.0 - t.dist_sq_center / t.spread_sq, 0, 1) * t.center_strength;
    
    t.grad = t.g_center;

    // 3. Satellites (Fixed 3 satellites, 120 degrees apart)
    t.sat_spread_sq = math.pow(t.satellite_spread * t.base_radius, 2);
    t.sat_dist_val = t.satellite_distance * t.base_radius * 2.0;
    
    // Random rotation based on center position
    t.rot_seed = query.noise(t.center_x, t.center_z) * 360.0;
    
    t.i = 0;
    loop(3, {
        t.angle = t.rot_seed + t.i * 120.0;
        t.sx = math.cos(t.angle) * t.sat_dist_val;
        t.sz = math.sin(t.angle) * t.sat_dist_val;
        
        t.sdx = t.dx - t.sx;
        t.sdz = t.dz - t.sz;
        t.dist_sq_sat = t.sdx * t.sdx + t.sdz * t.sdz;
        
        t.g_sat = math.clamp(1.0 - t.dist_sq_sat / t.sat_spread_sq, 0, 1) * t.satellite_strength;
        t.grad = math.max(t.grad, t.g_sat);
        
        t.i = t.i + 1;
    });
    
    t.noise_island = math.clamp((t.noise + t.grad) / (1.0 + t.center_strength), 0, 1);
    """
    np.random.seed(seed)
    
    # 1. 生成基础噪声
    # 注意：PerlinNoise.noise() 可能为负值；若直接与梯度相加，中心也可能被“拉塌”形成空洞。
    noise_base = generate_octave_perlin(width, height, scale, octaves, persistence, lacunarity, seed)
    if base_normalize:
        # 依据八度振幅总和，将噪声近似归一化到 [0, 1]
        amp_sum = float(np.sum([persistence ** o for o in range(int(octaves))]))
        if amp_sum <= 1e-9:
            amp_sum = 1.0
        noise_base = noise_base / amp_sum
        noise_base = (noise_base + 1.0) * 0.5
        noise_base = np.clip(noise_base, 0.0, 1.0)
    
    # 2. 坐标网格 [-1, 1]
    x = np.linspace(-1, 1, width)
    y = np.linspace(-1, 1, height)
    X, Y = np.meshgrid(x, y)
    
    # 初始化全局梯度掩码
    global_gradient = np.zeros((height, width))
    
    # --- 中心岛 ---
    # 计算到中心(0,0)的距离
    dist_center = np.sqrt(X**2 + Y**2)
    # 径向梯度: 1 - (dist/spread)^2
    grad_center = 1.0 - (dist_center / island_spread) ** 2
    grad_center = np.clip(grad_center, 0, 1) * center_strength
    
    global_gradient = np.maximum(global_gradient, grad_center)
    
    # --- 卫星岛 ---
    # 固定3个卫星岛，互成120度
    # 随机初始角度
    base_angle = np.random.uniform(0, 2 * np.pi)
    # 固定距离 satellite_distance
    
    for i in range(3):
        angle = base_angle + i * (2 * np.pi / 3)
        
        sx = satellite_distance * np.cos(angle)
        sy = satellite_distance * np.sin(angle)
        
        # 计算到卫星中心的距离
        dist_sat = np.sqrt((X - sx)**2 + (Y - sy)**2)
        
        grad_sat = 1.0 - (dist_sat / satellite_spread) ** 2
        grad_sat = np.clip(grad_sat, 0, 1) * satellite_strength
        
        # 取最大值，实现岛屿融合
        global_gradient = np.maximum(global_gradient, grad_sat)
    
    # 3. 混合
    # roughness 控制基础噪声对地形起伏的影响（越大越“抖”）
    if base_normalize:
        base_term = (noise_base - 0.5) * float(roughness)
    else:
        base_term = noise_base * float(roughness)

    final_terrain = global_gradient + base_term

    # 4. 消除中心空洞：在“中心岛梯度”范围内强制一个最低地形
    # center_floor ∈ [0, 1]，越大越“填平”中心；0 表示不启用该钳制。
    if center_floor is not None and float(center_floor) > 0:
        floor_mask = np.clip(grad_center / max(float(center_strength), 1e-9), 0.0, 1.0)
        floor_min = float(center_floor) * float(center_strength) * floor_mask
        final_terrain = np.maximum(final_terrain, floor_min)
    
    return final_terrain

# 定义每种噪声支持的参数及其范围
NOISE_TYPES = {
    "Island & Satellites": {
        "func": generate_island_noise,
        "params": [
            {"id": "scale", "name": "Noise Scale", "min": 10.0, "max": 200.0, "default": 60.0},
            {"id": "octaves", "name": "Octaves", "min": 1, "max": 8, "default": 5, "step": 1},
            {"id": "island_spread", "name": "Main Island Radius", "min": 0.5, "max": 2.0, "default": 1.0},
            {"id": "center_strength", "name": "Main Island Height", "min": 0.5, "max": 5.0, "default": 2.0},
            {"id": "satellite_spread", "name": "Satellite Radius", "min": 0.1, "max": 1.0, "default": 0.4},
            {"id": "satellite_strength", "name": "Satellite Height", "min": 0.5, "max": 3.0, "default": 1.2},
            {"id": "satellite_distance", "name": "Satellite Distance", "min": 0.3, "max": 2.0, "default": 0.7},
            {"id": "roughness", "name": "Base Roughness", "min": 0.0, "max": 3.0, "default": 1.0},
            {"id": "center_floor", "name": "Center Floor (No Hole)", "min": 0.0, "max": 1.0, "default": 0.35},
        ]
    },
    "Center Perlin": {
        "func": generate_center_noise,
        "params": [
            {"id": "scale", "name": "Noise Scale", "min": 10.0, "max": 200.0, "default": 60.0},
            {"id": "octaves", "name": "Octaves", "min": 1, "max": 8, "default": 4, "step": 1},
            {"id": "persistence", "name": "Persistence", "min": 0.1, "max": 1.0, "default": 0.5},
            {"id": "lacunarity", "name": "Lacunarity", "min": 1.0, "max": 4.0, "default": 2.0},
            {"id": "center_spread", "name": "Center Radius", "min": 0.2, "max": 2.0, "default": 1.0},
            {"id": "center_strength", "name": "Center Height", "min": 0.0, "max": 5.0, "default": 1.2},
            {"id": "roughness", "name": "Base Roughness", "min": 0.0, "max": 3.0, "default": 1.0},
            {"id": "center_floor", "name": "Center Floor (No Hole)", "min": 0.0, "max": 1.0, "default": 0.0},
        ]
    },
    "Octave Perlin": {
        "func": generate_octave_perlin,
        "params": [
            {"id": "scale", "name": "Scale", "min": 5.0, "max": 200.0, "default": 50.0},
            {"id": "octaves", "name": "Octaves", "min": 1, "max": 8, "default": 4, "step": 1},
            {"id": "persistence", "name": "Persistence", "min": 0.1, "max": 1.0, "default": 0.5},
            {"id": "lacunarity", "name": "Lacunarity", "min": 1.0, "max": 4.0, "default": 2.0},
        ]
    },
    "Value Noise": {
        "func": generate_value_noise,
        "params": [
            {"id": "scale", "name": "Scale", "min": 5.0, "max": 200.0, "default": 30.0},
            {"id": "octaves", "name": "Octaves", "min": 1, "max": 5, "default": 1, "step": 1},
        ]
    },
    "White Noise": {
        "func": generate_white_noise,
        "params": [
            {"id": "intensity", "name": "Intensity", "min": 0.1, "max": 2.0, "default": 1.0},
            {"id": "threshold", "name": "Threshold", "min": 0.0, "max": 0.9, "default": 0.0},
        ]
    },
    "Checkerboard": {
        "func": generate_checkerboard,
        "params": [
            {"id": "size", "name": "Block Size", "min": 4.0, "max": 128.0, "default": 32.0, "step": 4},
        ]
    }
}

