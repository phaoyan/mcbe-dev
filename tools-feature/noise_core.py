import numpy as np
import random

class PerlinNoise:
    """Perlin Noise 生成器 (梯度噪声)"""
    def __init__(self, seed=42):
        self.seed = seed
        random.seed(seed)
        np.random.seed(seed)
        self.permutation = list(range(256))
        random.shuffle(self.permutation)
        self.permutation = self.permutation + self.permutation
        self.gradients = [
            (1, 1), (-1, 1), (1, -1), (-1, -1),
            (1, 0), (-1, 0), (0, 1), (0, -1)
        ]
    
    def _hash(self, x, y):
        return self.permutation[self.permutation[x % 256] + (y % 256)]
    
    def _get_gradient(self, x, y):
        hash_val = self._hash(x, y)
        return self.gradients[hash_val % len(self.gradients)]
    
    @staticmethod
    def _fade(t):
        return t * t * t * (t * (t * 6 - 15) + 10)
    
    @staticmethod
    def _lerp(a, b, t):
        return a + t * (b - a)
    
    def _dot_product(self, grad, x, y):
        return grad[0] * x + grad[1] * y
    
    def noise(self, x, y):
        X = int(np.floor(x)) & 255
        Y = int(np.floor(y)) & 255
        x -= np.floor(x)
        y -= np.floor(y)
        u = self._fade(x)
        v = self._fade(y)
        g00 = self._get_gradient(X, Y)
        g10 = self._get_gradient(X + 1, Y)
        g01 = self._get_gradient(X, Y + 1)
        g11 = self._get_gradient(X + 1, Y + 1)
        n00 = self._dot_product(g00, x, y)
        n10 = self._dot_product(g10, x - 1, y)
        n01 = self._dot_product(g01, x, y - 1)
        n11 = self._dot_product(g11, x - 1, y - 1)
        nx0 = self._lerp(n00, n10, u)
        nx1 = self._lerp(n01, n11, u)
        return self._lerp(nx0, nx1, v)

class ValueNoise:
    """Value Noise 生成器 (基于晶格值的平滑噪声)"""
    def __init__(self, seed=42):
        self.seed = seed
        np.random.seed(seed)
        # 生成一个随机值表
        self.values = np.random.rand(256, 256)

    def _get_value(self, x, y):
        # 简单的包裹寻址
        return self.values[x % 256, y % 256]

    @staticmethod
    def _fade(t):
        return t * t * t * (t * (t * 6 - 15) + 10)

    @staticmethod
    def _lerp(a, b, t):
        return a + t * (b - a)

    def noise(self, x, y):
        X = int(np.floor(x))
        Y = int(np.floor(y))
        x_frac = x - np.floor(x)
        y_frac = y - np.floor(y)

        u = self._fade(x_frac)
        v = self._fade(y_frac)

        v00 = self._get_value(X, Y)
        v10 = self._get_value(X + 1, Y)
        v01 = self._get_value(X, Y + 1)
        v11 = self._get_value(X + 1, Y + 1)

        vx0 = self._lerp(v00, v10, u)
        vx1 = self._lerp(v01, v11, u)
        return self._lerp(vx0, vx1, v)

