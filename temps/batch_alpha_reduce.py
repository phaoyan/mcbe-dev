#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量处理粒子贴图的alpha reduce版本
"""

import os
import sys
from progressive_alpha_reducer import ProgressiveAlphaReducer

def batch_process_alpha_reduce():
    """批量处理指定目录下的PNG文件"""
    
    # 设置路径
    input_dir = r"D:\coding\projects\minecraft-dev\project\mcbe-dev\resource_packs\minecraft_dev\textures\particle"
    
    # 要处理的文件列表
    files_to_process = [
        "rune_circle.png",
        "pale_impact.png", 
        "huo_4.png"
    ]
    
    # 处理参数配置 - 提高强度
    configs = [
        {
            "method": "linear",
            "threshold": 128,
            "intensity": 0.8,  # 从0.6提升到0.8
            "suffix": "_alpha_reduced"
        },
        {
            "method": "exponential", 
            "threshold": 100,
            "intensity": 0.9,  # 从0.7提升到0.9
            "power": 2.5,
            "suffix": "_alpha_exp"
        },
        {
            "method": "sigmoid",
            "threshold": 120,
            "intensity": 0.7,  # 从0.5提升到0.7
            "steepness": 8.0,
            "suffix": "_alpha_smooth"
        }
    ]
    
    reducer = ProgressiveAlphaReducer()
    
    print("=" * 80)
    print("批量透明度处理开始")
    print("=" * 80)
    
    total_processed = 0
    total_success = 0
    
    for filename in files_to_process:
        input_path = os.path.join(input_dir, filename)
        
        if not os.path.exists(input_path):
            print(f"跳过不存在的文件: {input_path}")
            continue
            
        print(f"\n处理文件: {filename}")
        print("-" * 60)
        
        # 获取文件名（不含扩展名）
        name_without_ext = os.path.splitext(filename)[0]
        
        for i, config in enumerate(configs, 1):
            print(f"\n配置 {i}/{len(configs)}: {config['method']} 方法")
            
            # 生成输出文件名
            output_filename = f"{name_without_ext}{config['suffix']}.png"
            output_path = os.path.join(input_dir, output_filename)
            
            try:
                success = reducer.process_image(
                    input_path=input_path,
                    output_path=output_path,
                    method=config['method'],
                    threshold=config['threshold'],
                    intensity=config['intensity'],
                    power=config.get('power', 2.0),
                    steepness=config.get('steepness', 10.0),
                    preview_only=False
                )
                
                total_processed += 1
                if success:
                    total_success += 1
                    print(f"✓ 成功生成: {output_filename}")
                else:
                    print(f"✗ 处理失败: {output_filename}")
                    
            except Exception as e:
                print(f"✗ 处理异常: {e}")
                total_processed += 1
        
        print("-" * 60)
    
    print("\n" + "=" * 80)
    print("批量处理完成")
    print(f"总计处理: {total_processed} 个任务")
    print(f"成功完成: {total_success} 个任务") 
    print(f"失败任务: {total_processed - total_success} 个")
    print("=" * 80)

if __name__ == "__main__":
    batch_process_alpha_reduce()