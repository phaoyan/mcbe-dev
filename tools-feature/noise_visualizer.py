"""
Multi-Noise 可视化脚本 (交互版)
支持多种噪声类型的生成与可视化，并支持动态参数调整
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import TextBox, Button, RadioButtons
import argparse
import random
import time
import sys
import os

# 确保可以导入当前目录下的模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from noise_generators import NOISE_TYPES

# --- 配置常量 ---
DEFAULT_WIDTH = 256
DEFAULT_HEIGHT = 256
DEFAULT_SEED = 42

# 预设颜色映射
COLORMAPS = ['viridis', 'plasma', 'inferno', 'magma', 'terrain', 'ocean', 'gray', 'binary']

# --- 主应用逻辑 ---

class NoiseInteractiveApp:
    def __init__(self, width=DEFAULT_WIDTH, height=DEFAULT_HEIGHT):
        self.width = width
        self.height = height
        self.seed = DEFAULT_SEED
        self.current_noise_data = None
        
        # 默认选择第一个噪声类型
        self.current_noise_type = list(NOISE_TYPES.keys())[0]
        
        # 创建窗口
        self.fig, self.ax = plt.subplots(figsize=(13, 9))
        self.fig.canvas.manager.set_window_title('Multi-Noise Explorer')
        plt.subplots_adjust(left=0.30, bottom=0.30, right=0.95, top=0.95)
        
        # 初始化显示
        self.img_plot = self.ax.imshow(np.zeros((height, width)), cmap='viridis', origin='lower', vmin=0, vmax=1)
        self.colorbar = self.fig.colorbar(self.img_plot, ax=self.ax)
        self.ax.set_title(f"Noise Preview: {self.current_noise_type}")
        
        # --- 控件区域 ---
        ax_bg = 'lightgoldenrodyellow'
        
        # 1. 噪声类型选择 (Radio Buttons)
        self.ax_type = plt.axes([0.02, 0.60, 0.20, 0.25], facecolor=ax_bg)
        self.ax_type.set_title("Noise Type", fontsize=10)
        self.radio_type = RadioButtons(self.ax_type, list(NOISE_TYPES.keys()), active=0)
        self.radio_type.on_clicked(self.change_noise_type)
        
        # 2. 颜色映射选择
        self.ax_cmap = plt.axes([0.02, 0.35, 0.20, 0.20], facecolor=ax_bg)
        self.ax_cmap.set_title("Colormap", fontsize=10)
        self.radio_cmap = RadioButtons(self.ax_cmap, COLORMAPS, active=0)
        self.radio_cmap.on_clicked(self.change_cmap)
        
        # 3. 功能按钮
        self.ax_seed = plt.axes([0.02, 0.25, 0.09, 0.04])
        self.b_seed = Button(self.ax_seed, 'New Seed', color=ax_bg, hovercolor='0.95')
        self.b_seed.on_clicked(self.randomize_seed)
        
        self.ax_save = plt.axes([0.12, 0.25, 0.09, 0.04])
        self.b_save = Button(self.ax_save, 'Save', color=ax_bg, hovercolor='0.95')
        self.b_save.on_clicked(self.save_image)
        
        # 4. 动态参数输入框 (网格布局)
        self.params_widgets = []
        self.params_axes = []
        self.params_labels = []
        
        # 布局配置
        cols = 4
        rows = 2
        start_x = 0.25
        start_y = 0.18      # 第一行文本框的 Y 坐标
        col_width = 0.16
        row_height = 0.04
        x_gap = 0.02
        y_gap = 0.08        # 行间距 (包含标签空间)
        
        for i in range(cols * rows):
            r = i // cols
            c = i % cols
            
            x_pos = start_x + c * (col_width + x_gap)
            y_pos = start_y - r * y_gap
            
            ax = plt.axes([x_pos, y_pos, col_width, row_height], facecolor=ax_bg)
            
            # 初始创建文本框 (无自带标签)
            tb = TextBox(ax, "", initial="0", textalignment="center")
            tb.on_submit(self.update)
        
            # 创建上方标签
            label_y = y_pos + row_height + 0.005
            txt = self.fig.text(x_pos, label_y, f"Param {i+1}", fontsize=9, ha='left')
            
            self.params_widgets.append(tb)
            self.params_axes.append(ax)
            self.params_labels.append(txt)
        
        # 初始化界面状态
        self.setup_params_for_type(self.current_noise_type)
        self.update(None)

    def setup_params_for_type(self, noise_type):
        """根据选择的噪声类型配置参数输入框"""
        config = NOISE_TYPES[noise_type]
        params = config["params"]
        
        # 遍历所有输入框
        for i, widget in enumerate(self.params_widgets):
            ax = self.params_axes[i]
            lbl = self.params_labels[i]
            
            if i < len(params):
                p_conf = params[i]
                ax.set_visible(True)
                lbl.set_visible(True)
                
                # 更新标签
                lbl.set_text(p_conf["name"])
                
                # 设置当前值（重置为默认）
                widget.set_val(str(p_conf["default"]))
        else:
                # 该输入框不需要，隐藏
                ax.set_visible(False)
                lbl.set_visible(False)
        
        self.fig.canvas.draw_idle()

    def change_noise_type(self, label):
        """切换噪声类型回调"""
        if label != self.current_noise_type:
            self.current_noise_type = label
            self.setup_params_for_type(label)
        self.update(None)

    def change_cmap(self, label):
        self.img_plot.set_cmap(label)
        self.fig.canvas.draw_idle()

    def randomize_seed(self, event):
        self.seed = random.randint(0, 10000)
        self.update(None)

    def save_image(self, event):
        filename = f"noise_{self.current_noise_type.replace(' ', '_')}_{self.seed}.png"
        if self.current_noise_data is not None:
            plt.imsave(filename, self.current_noise_data, cmap=self.img_plot.get_cmap(), origin='lower')
            print(f"已保存: {filename}")

    def update(self, val):
        """核心更新逻辑"""
        config = NOISE_TYPES[self.current_noise_type]
        func = config["func"]
        params_def = config["params"]
        
        # 收集参数
        kwargs = {"seed": self.seed}
        info_parts = [f"Seed: {self.seed}"]
        
        for i, p_def in enumerate(params_def):
            text_val = self.params_widgets[i].text
            try:
                val = float(text_val)
                # 如果默认值是整数，且没有小数部分，或者 step 是整数，则转为整数
                if isinstance(p_def["default"], int):
                    val = int(val)
                
                # 限制范围
                if "min" in p_def:
                    val = max(val, p_def["min"])
                if "max" in p_def:
                    val = min(val, p_def["max"])
                
                kwargs[p_def["id"]] = val
                
                # 格式化 info
                if isinstance(val, float):
                    info_parts.append(f"{p_def['name']}: {val:.2f}")
                else:
                    info_parts.append(f"{p_def['name']}: {val}")
            except ValueError:
                print(f"Error: Invalid input for {p_def['name']}: '{text_val}'")
                return

        # 更新标题
        self.ax.set_title(f"{self.current_noise_type} | " + " | ".join(info_parts), fontsize=9)
        
        # 生成噪声
        t0 = time.time()
        try:
            noise = func(self.width, self.height, **kwargs)
        except Exception as e:
            print(f"Generation Error: {e}")
            return
        
        # 归一化 (Visual normalization)
        v_min, v_max = noise.min(), noise.max()
        if v_max - v_min > 1e-6:
            noise_norm = (noise - v_min) / (v_max - v_min)
        else:
            noise_norm = np.zeros_like(noise)
            
        self.current_noise_data = noise_norm
        self.img_plot.set_data(noise_norm)
        self.fig.canvas.draw_idle()

    def show(self):
        plt.show()

# --- 命令行入口 ---

def main():
    parser = argparse.ArgumentParser(description='Multi-Noise 可视化工具')
    parser.add_argument('--no-gui', action='store_true', help='直接生成图片模式')
    parser.add_argument('--type', type=str, default='Octave Perlin', choices=NOISE_TYPES.keys(), help='噪声类型 (仅非交互模式)')
    parser.add_argument('--width', type=int, default=256)
    parser.add_argument('--height', type=int, default=256)
    parser.add_argument('--save', type=str, default='output.png')
    
    args, unknown = parser.parse_known_args()
    
    if args.no_gui:
        print(f"Generating {args.type} ({args.width}x{args.height})...")
        config = NOISE_TYPES[args.type]
        func = config["func"]
        
        # 使用默认参数
        kwargs = {p["id"]: p["default"] for p in config["params"]}
        kwargs["seed"] = DEFAULT_SEED
        
        noise = func(args.width, args.height, **kwargs)
        
        # 归一化保存
        noise = (noise - noise.min()) / (noise.max() - noise.min())
        plt.imsave(args.save, noise, cmap='viridis', origin='lower')
        print(f"Saved to {args.save}")
    else:
        app = NoiseInteractiveApp(width=args.width, height=args.height)
        app.show()

if __name__ == '__main__':
    main()

