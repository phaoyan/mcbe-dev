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

def generate_island_noise(width, height, scale=50.0, octaves=4, persistence=0.5, lacunarity=2.0, 
                          island_spread=1.0, center_strength=2.0, 
                          satellite_spread=0.6, satellite_strength=1.5, satellite_distance=0.7, seed=42, **kwargs):
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
    noise_base = generate_octave_perlin(width, height, scale, octaves, persistence, lacunarity, seed)
    
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
    final_terrain = noise_base + global_gradient
    
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

