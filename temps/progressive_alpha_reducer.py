#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
渐进式透明度处理工具
支持多种渐进算法和命令行参数配置
"""

import os
import sys
import argparse
import math
from PIL import Image
import numpy as np

class ProgressiveAlphaReducer:
    """渐进式透明度处理器"""
    
    def __init__(self):
        self.supported_methods = ['linear', 'exponential', 'sigmoid', 'smooth_step']
    
    def linear_reduction(self, alpha, threshold, intensity):
        """线性渐进减少
        
        Args:
            alpha: 原始透明度值 (0-255)
            threshold: 阈值
            intensity: 强度 (0-1)
        """
        if alpha >= threshold:
            return alpha
        
        # 计算减少比例：越接近0，减少得越多
        reduction_ratio = intensity * (threshold - alpha) / threshold
        new_alpha = alpha * (1 - reduction_ratio)
        return max(0, int(new_alpha))
    
    def exponential_reduction(self, alpha, threshold, intensity, power=2.0):
        """指数渐进减少
        
        Args:
            alpha: 原始透明度值
            threshold: 阈值
            intensity: 强度 (0-1)
            power: 指数参数，越大曲线越陡峭
        """
        if alpha >= threshold:
            return alpha
        
        # 指数曲线：低透明度值受影响更大
        normalized_alpha = alpha / threshold
        reduction_ratio = intensity * (1 - pow(normalized_alpha, power))
        new_alpha = alpha * (1 - reduction_ratio)
        return max(0, int(new_alpha))
    
    def sigmoid_reduction(self, alpha, threshold, intensity, steepness=10.0):
        """Sigmoid渐进减少
        
        Args:
            alpha: 原始透明度值
            threshold: 阈值
            intensity: 强度 (0-1)
            steepness: 曲线陡峭程度
        """
        if alpha >= threshold:
            return alpha
        
        # Sigmoid函数提供平滑过渡
        normalized_alpha = (alpha - threshold/2) / (threshold/2)
        sigmoid_value = 1 / (1 + math.exp(-steepness * normalized_alpha))
        reduction_ratio = intensity * (1 - sigmoid_value)
        new_alpha = alpha * (1 - reduction_ratio)
        return max(0, int(new_alpha))
    
    def smooth_step_reduction(self, alpha, threshold, intensity):
        """平滑步骤减少（类似smooth step函数）
        
        Args:
            alpha: 原始透明度值
            threshold: 阈值
            intensity: 强度 (0-1)
        """
        if alpha >= threshold:
            return alpha
        
        # Smooth step函数：3t^2 - 2t^3
        t = alpha / threshold
        smooth_factor = 3 * t * t - 2 * t * t * t
        reduction_ratio = intensity * (1 - smooth_factor)
        new_alpha = alpha * (1 - reduction_ratio)
        return max(0, int(new_alpha))
    
    def process_image(self, input_path, output_path, method='linear', threshold=128, 
                     intensity=0.5, power=2.0, steepness=10.0, preview_only=False):
        """处理图片透明度
        
        Args:
            input_path: 输入文件路径
            output_path: 输出文件路径
            method: 处理方法 ('linear', 'exponential', 'sigmoid', 'smooth_step')
            threshold: 透明度阈值 (0-255)
            intensity: 处理强度 (0-1)
            power: 指数方法的幂参数
            steepness: sigmoid方法的陡峭度参数
            preview_only: 仅预览，不保存文件
        """
        
        # 检查输入文件
        if not os.path.exists(input_path):
            print(f"错误：输入文件不存在 - {input_path}")
            return False
        
        # 检查方法
        if method not in self.supported_methods:
            print(f"错误：不支持的方法 '{method}'")
            print(f"支持的方法: {', '.join(self.supported_methods)}")
            return False
        
        try:
            # 加载图片
            img = Image.open(input_path)
            
            # 转换为RGBA
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            print(f"处理配置:")
            print(f"  输入文件: {input_path}")
            print(f"  输出文件: {output_path}")
            print(f"  图片尺寸: {img.size}")
            print(f"  处理方法: {method}")
            print(f"  透明度阈值: {threshold}")
            print(f"  处理强度: {intensity}")
            if method == 'exponential':
                print(f"  指数参数: {power}")
            elif method == 'sigmoid':
                print(f"  陡峭度参数: {steepness}")
            print(f"  仅预览模式: {preview_only}")
            print("-" * 60)
            
            # 转换为numpy数组
            img_array = np.array(img)
            alpha_channel = img_array[:, :, 3]
            
            # 分析原始透明度分布
            total_pixels = alpha_channel.size
            affected_mask = alpha_channel < threshold
            affected_count = np.sum(affected_mask)
            
            print(f"原始透明度分析:")
            print(f"  总像素数: {total_pixels}")
            print(f"  透明度 < {threshold} 的像素: {affected_count} ({affected_count/total_pixels*100:.1f}%)")
            print(f"  透明度 >= {threshold} 的像素: {total_pixels - affected_count} ({(total_pixels - affected_count)/total_pixels*100:.1f}%)")
            
            if affected_count == 0:
                print("没有需要处理的像素。")
                return True
            
            # 复制数组进行处理
            modified_array = img_array.copy()
            
            # 根据方法处理透明度
            for y in range(img_array.shape[0]):
                for x in range(img_array.shape[1]):
                    original_alpha = alpha_channel[y, x]
                    
                    if method == 'linear':
                        new_alpha = self.linear_reduction(original_alpha, threshold, intensity)
                    elif method == 'exponential':
                        new_alpha = self.exponential_reduction(original_alpha, threshold, intensity, power)
                    elif method == 'sigmoid':
                        new_alpha = self.sigmoid_reduction(original_alpha, threshold, intensity, steepness)
                    elif method == 'smooth_step':
                        new_alpha = self.smooth_step_reduction(original_alpha, threshold, intensity)
                    
                    modified_array[y, x, 3] = new_alpha
            
            # 分析处理结果
            new_alpha_channel = modified_array[:, :, 3]
            
            # 统计变化
            changes = alpha_channel != new_alpha_channel
            changed_count = np.sum(changes)
            
            print(f"\n处理结果分析:")
            print(f"  实际被修改的像素: {changed_count}")
            
            # 显示一些变化示例
            if changed_count > 0:
                print(f"  修改示例（前10个）:")
                changed_indices = np.where(changes)
                for i in range(min(10, len(changed_indices[0]))):
                    y, x = changed_indices[0][i], changed_indices[1][i]
                    orig = alpha_channel[y, x]
                    new = new_alpha_channel[y, x]
                    reduction = (orig - new) / orig * 100 if orig > 0 else 0
                    print(f"    像素({x:3d}, {y:3d}): {orig:3d} -> {new:3d} (减少 {reduction:.1f}%)")
            
            # 统计透明度值分布变化
            print(f"\n透明度分布变化:")
            orig_unique, orig_counts = np.unique(alpha_channel, return_counts=True)
            new_unique, new_counts = np.unique(new_alpha_channel, return_counts=True)
            print(f"  原始唯一alpha值数量: {len(orig_unique)}")
            print(f"  处理后唯一alpha值数量: {len(new_unique)}")
            print(f"  原始alpha范围: {alpha_channel.min()} - {alpha_channel.max()}")
            print(f"  处理后alpha范围: {new_alpha_channel.min()} - {new_alpha_channel.max()}")
            
            if not preview_only:
                # 保存图片
                modified_img = Image.fromarray(modified_array, 'RGBA')
                
                # 确保输出目录存在
                output_dir = os.path.dirname(output_path)
                if output_dir and not os.path.exists(output_dir):
                    os.makedirs(output_dir, exist_ok=True)
                
                modified_img.save(output_path, 'PNG')
                print(f"\n文件已保存: {output_path}")
            else:
                print(f"\n预览模式：未保存文件")
            
            return True
            
        except Exception as e:
            print(f"处理图片时发生错误: {e}")
            import traceback
            traceback.print_exc()
            return False

def main():
    parser = argparse.ArgumentParser(
        description='渐进式透明度处理工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 基本用法（线性减少）
  python progressive_alpha_reducer.py input.png output.png
  
  # 指定处理方法和强度
  python progressive_alpha_reducer.py input.png output.png -m exponential -i 0.8
  
  # 设置自定义阈值
  python progressive_alpha_reducer.py input.png output.png -t 100 -i 0.6
  
  # 使用sigmoid方法
  python progressive_alpha_reducer.py input.png output.png -m sigmoid -i 0.7 --steepness 5
  
  # 仅预览效果，不保存文件
  python progressive_alpha_reducer.py input.png output.png -p

支持的处理方法:
  linear      - 线性渐进减少（默认）
  exponential - 指数渐进减少
  sigmoid     - Sigmoid平滑减少  
  smooth_step - 平滑步骤减少
        """
    )
    
    parser.add_argument('input', help='输入图片文件路径')
    parser.add_argument('output', help='输出图片文件路径')
    parser.add_argument('-m', '--method', 
                       choices=['linear', 'exponential', 'sigmoid', 'smooth_step'],
                       default='linear',
                       help='处理方法（默认: linear）')
    parser.add_argument('-t', '--threshold', type=int, default=128,
                       help='透明度阈值，0-255（默认: 128）')
    parser.add_argument('-i', '--intensity', type=float, default=0.5,
                       help='处理强度，0-1（默认: 0.5）')
    parser.add_argument('--power', type=float, default=2.0,
                       help='指数方法的幂参数（默认: 2.0）')
    parser.add_argument('--steepness', type=float, default=10.0,
                       help='sigmoid方法的陡峭度参数（默认: 10.0）')
    parser.add_argument('-p', '--preview', action='store_true',
                       help='仅预览效果，不保存文件')
    
    args = parser.parse_args()
    
    # 验证参数
    if not (0 <= args.intensity <= 1):
        print("错误：强度参数必须在0-1之间")
        return 1
    
    if not (0 <= args.threshold <= 255):
        print("错误：阈值参数必须在0-255之间")
        return 1
    
    # 创建处理器并执行
    reducer = ProgressiveAlphaReducer()
    
    success = reducer.process_image(
        input_path=args.input,
        output_path=args.output,
        method=args.method,
        threshold=args.threshold,
        intensity=args.intensity,
        power=args.power,
        steepness=args.steepness,
        preview_only=args.preview
    )
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())