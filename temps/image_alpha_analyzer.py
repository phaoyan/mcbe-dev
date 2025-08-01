#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
图片透明度可视化分析工具

功能：
- 分析图片的Alpha通道
- 生成透明度分布直方图
- 创建透明度热力图
- 显示详细的统计信息
- 支持PNG、TIFF等带透明度的图片格式
"""

import sys
import os
import argparse
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image, ImageDraw
import seaborn as sns
from pathlib import Path

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

class ImageAlphaAnalyzer:
    def __init__(self, image_path):
        """
        初始化透明度分析器
        
        Args:
            image_path (str): 图片文件路径
        """
        self.image_path = Path(image_path)
        self.image = None
        self.alpha_data = None
        self.has_alpha = False
        
        self._load_image()
    
    def _load_image(self):
        """加载图片并检查是否有Alpha通道"""
        try:
            self.image = Image.open(self.image_path)
            print(f"✓ 成功加载图片: {self.image_path.name}")
            print(f"  格式: {self.image.format}")
            print(f"  模式: {self.image.mode}")
            print(f"  尺寸: {self.image.size}")
            
            # 检查是否有Alpha通道
            if self.image.mode in ('RGBA', 'LA', 'PA'):
                self.has_alpha = True
                # 提取Alpha通道
                if self.image.mode == 'RGBA':
                    self.alpha_data = np.array(self.image.split()[3])
                elif self.image.mode == 'LA':
                    self.alpha_data = np.array(self.image.split()[1])
                elif self.image.mode == 'PA':
                    # 将调色板模式转换为RGBA
                    rgba_image = self.image.convert('RGBA')
                    self.alpha_data = np.array(rgba_image.split()[3])
                
                print(f"✓ 检测到Alpha通道")
            else:
                self.has_alpha = False
                print(f"✗ 未检测到Alpha通道，图片为不透明")
                
        except Exception as e:
            print(f"✗ 加载图片失败: {e}")
            sys.exit(1)
    
    def get_alpha_statistics(self):
        """获取Alpha通道统计信息"""
        if not self.has_alpha:
            return None
        
        stats = {
            '最小值': np.min(self.alpha_data),
            '最大值': np.max(self.alpha_data),
            '平均值': np.mean(self.alpha_data),
            '中位数': np.median(self.alpha_data),
            '标准差': np.std(self.alpha_data),
            '完全透明像素数': np.sum(self.alpha_data == 0),
            '完全不透明像素数': np.sum(self.alpha_data == 255),
            '半透明像素数': np.sum((self.alpha_data > 0) & (self.alpha_data < 255)),
            '总像素数': self.alpha_data.size,
        }
        
        # 计算百分比
        total_pixels = stats['总像素数']
        stats['完全透明百分比'] = (stats['完全透明像素数'] / total_pixels) * 100
        stats['完全不透明百分比'] = (stats['完全不透明像素数'] / total_pixels) * 100
        stats['半透明百分比'] = (stats['半透明像素数'] / total_pixels) * 100
        
        return stats
    
    def plot_alpha_histogram(self, ax=None):
        """绘制Alpha值分布直方图"""
        if not self.has_alpha:
            return None
        
        if ax is None:
            fig, ax = plt.subplots(figsize=(10, 6))
        
        # 绘制直方图
        alpha_flat = self.alpha_data.flatten()
        counts, bins, patches = ax.hist(alpha_flat, bins=50, alpha=0.7, 
                                       color='skyblue', edgecolor='black')
        
        # 添加统计线
        mean_val = np.mean(alpha_flat)
        median_val = np.median(alpha_flat)
        
        ax.axvline(mean_val, color='red', linestyle='--', linewidth=2, 
                  label=f'平均值: {mean_val:.1f}')
        ax.axvline(median_val, color='green', linestyle='--', linewidth=2, 
                  label=f'中位数: {median_val:.1f}')
        
        ax.set_xlabel('Alpha值 (0=完全透明, 255=完全不透明)')
        ax.set_ylabel('像素数量')
        ax.set_title('Alpha通道值分布直方图')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        return ax
    
    def plot_alpha_heatmap(self, ax=None):
        """绘制Alpha通道热力图"""
        if not self.has_alpha:
            return None
        
        if ax is None:
            fig, ax = plt.subplots(figsize=(10, 8))
        
        # 创建热力图
        im = ax.imshow(self.alpha_data, cmap='viridis', interpolation='nearest')
        
        # 添加颜色条
        cbar = plt.colorbar(im, ax=ax, shrink=0.8)
        cbar.set_label('Alpha值', rotation=270, labelpad=20)
        
        ax.set_title('Alpha通道热力图')
        ax.set_xlabel('X坐标 (像素)')
        ax.set_ylabel('Y坐标 (像素)')
        
        return ax
    
    def plot_alpha_zones(self, ax=None):
        """绘制透明度区域分析"""
        if not self.has_alpha:
            return None
        
        if ax is None:
            fig, ax = plt.subplots(figsize=(10, 8))
        
        # 创建区域分类图
        zones = np.zeros_like(self.alpha_data)
        zones[self.alpha_data == 0] = 0          # 完全透明
        zones[(self.alpha_data > 0) & (self.alpha_data < 255)] = 1  # 半透明
        zones[self.alpha_data == 255] = 2        # 完全不透明
        
        # 自定义颜色映射
        colors = ['red', 'yellow', 'green']  # 透明、半透明、不透明
        cmap = plt.matplotlib.colors.ListedColormap(colors)
        
        im = ax.imshow(zones, cmap=cmap, interpolation='nearest')
        
        # 添加图例
        legend_elements = [
            patches.Patch(color='red', label='完全透明 (α=0)'),
            patches.Patch(color='yellow', label='半透明 (0<α<255)'),
            patches.Patch(color='green', label='完全不透明 (α=255)')
        ]
        ax.legend(handles=legend_elements, loc='upper right')
        
        ax.set_title('透明度区域分析')
        ax.set_xlabel('X坐标 (像素)')
        ax.set_ylabel('Y坐标 (像素)')
        
        return ax
    
    def plot_alpha_profile(self, ax=None, direction='horizontal'):
        """绘制Alpha值剖面图"""
        if not self.has_alpha:
            return None
        
        if ax is None:
            fig, ax = plt.subplots(figsize=(12, 6))
        
        if direction == 'horizontal':
            # 水平方向剖面（每行的平均Alpha值）
            profile = np.mean(self.alpha_data, axis=1)
            ax.plot(range(len(profile)), profile, 'b-', linewidth=2)
            ax.set_xlabel('行索引')
            ax.set_ylabel('平均Alpha值')
            ax.set_title('水平方向Alpha剖面图')
        else:
            # 垂直方向剖面（每列的平均Alpha值）
            profile = np.mean(self.alpha_data, axis=0)
            ax.plot(range(len(profile)), profile, 'r-', linewidth=2)
            ax.set_xlabel('列索引')
            ax.set_ylabel('平均Alpha值')
            ax.set_title('垂直方向Alpha剖面图')
        
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 255)
        
        return ax
    
    def create_comprehensive_analysis(self, save_path=None):
        """创建综合分析图表"""
        if not self.has_alpha:
            print("⚠️ 图片没有Alpha通道，无法进行透明度分析")
            return
        
        # 创建子图布局
        fig = plt.figure(figsize=(20, 15))
        
        # 1. 原图和Alpha通道对比
        ax1 = plt.subplot(3, 3, 1)
        if self.image.mode == 'RGBA':
            rgb_image = Image.new('RGB', self.image.size, (255, 255, 255))
            rgb_image.paste(self.image, mask=self.image.split()[3])
            ax1.imshow(np.array(rgb_image))
        else:
            ax1.imshow(np.array(self.image.convert('RGB')))
        ax1.set_title('原图')
        ax1.axis('off')
        
        ax2 = plt.subplot(3, 3, 2)
        ax2.imshow(self.alpha_data, cmap='gray')
        ax2.set_title('Alpha通道')
        ax2.axis('off')
        
        # 2. Alpha分布直方图
        ax3 = plt.subplot(3, 3, 3)
        self.plot_alpha_histogram(ax3)
        
        # 3. Alpha热力图
        ax4 = plt.subplot(3, 3, 4)
        self.plot_alpha_heatmap(ax4)
        
        # 4. 透明度区域分析
        ax5 = plt.subplot(3, 3, 5)
        self.plot_alpha_zones(ax5)
        
        # 5. 水平剖面
        ax6 = plt.subplot(3, 3, 6)
        self.plot_alpha_profile(ax6, 'horizontal')
        
        # 6. 垂直剖面
        ax7 = plt.subplot(3, 3, 7)
        self.plot_alpha_profile(ax7, 'vertical')
        
        # 7. 统计信息表
        ax8 = plt.subplot(3, 3, 8)
        stats = self.get_alpha_statistics()
        
        # 创建统计信息表格
        stats_text = []
        for key, value in stats.items():
            if isinstance(value, float):
                if '百分比' in key:
                    stats_text.append(f"{key}: {value:.2f}%")
                else:
                    stats_text.append(f"{key}: {value:.2f}")
            else:
                stats_text.append(f"{key}: {value}")
        
        ax8.text(0.05, 0.95, '\n'.join(stats_text), transform=ax8.transAxes,
                fontsize=10, verticalalignment='top', fontfamily='monospace')
        ax8.set_title('统计信息')
        ax8.axis('off')
        
        # 8. Alpha梯度分析
        ax9 = plt.subplot(3, 3, 9)
        if self.alpha_data.shape[0] > 1 and self.alpha_data.shape[1] > 1:
            # 计算梯度
            grad_y, grad_x = np.gradient(self.alpha_data.astype(float))
            gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2)
            
            im = ax9.imshow(gradient_magnitude, cmap='hot')
            ax9.set_title('Alpha梯度强度')
            ax9.axis('off')
            plt.colorbar(im, ax=ax9, shrink=0.8)
        
        plt.suptitle(f'图片透明度综合分析 - {self.image_path.name}', fontsize=16)
        plt.tight_layout()
        
        # 保存或显示
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"✓ 分析结果已保存到: {save_path}")
        else:
            plt.show()
        
        return fig
    
    def print_summary(self):
        """打印分析摘要"""
        print("\n" + "="*60)
        print("📊 图片透明度分析摘要")
        print("="*60)
        
        if not self.has_alpha:
            print("⚠️ 此图片不包含透明度信息")
            return
        
        stats = self.get_alpha_statistics()
        
        print(f"📁 文件: {self.image_path.name}")
        print(f"📏 尺寸: {self.image.size[0]}×{self.image.size[1]}")
        print(f"🎨 模式: {self.image.mode}")
        print()
        
        print("🔍 透明度统计:")
        print(f"  • 透明范围: {stats['最小值']} - {stats['最大值']}")
        print(f"  • 平均透明度: {stats['平均值']:.1f}")
        print(f"  • 中位数: {stats['中位数']:.1f}")
        print(f"  • 标准差: {stats['标准差']:.1f}")
        print()
        
        print("📈 像素分布:")
        print(f"  • 完全透明: {stats['完全透明像素数']:,} ({stats['完全透明百分比']:.1f}%)")
        print(f"  • 半透明: {stats['半透明像素数']:,} ({stats['半透明百分比']:.1f}%)")
        print(f"  • 完全不透明: {stats['完全不透明像素数']:,} ({stats['完全不透明百分比']:.1f}%)")
        print(f"  • 总像素数: {stats['总像素数']:,}")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='图片透明度可视化分析工具')
    parser.add_argument('image_path', help='图片文件路径')
    parser.add_argument('-o', '--output', help='输出分析图片的路径')
    parser.add_argument('--no-show', action='store_true', help='不显示图表，仅保存')
    
    args = parser.parse_args()
    
    # 检查输入文件
    if not os.path.exists(args.image_path):
        print(f"✗ 文件不存在: {args.image_path}")
        sys.exit(1)
    
    # 创建分析器
    analyzer = ImageAlphaAnalyzer(args.image_path)
    
    # 打印摘要
    analyzer.print_summary()
    
    # 生成分析图表
    if analyzer.has_alpha:
        print("\n🎨 正在生成可视化分析...")
        
        # 设置输出路径
        output_path = args.output
        if not output_path and not args.no_show:
            # 如果没有指定输出且不是仅保存模式，显示图表
            analyzer.create_comprehensive_analysis()
        else:
            if not output_path:
                # 自动生成输出文件名
                input_path = Path(args.image_path)
                output_path = f"temps/{input_path.stem}_alpha_analysis.png"
            
            analyzer.create_comprehensive_analysis(output_path)
            
            if not args.no_show:
                plt.show()

if __name__ == "__main__":
    main()