#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
透明度分析工具测试脚本

这个脚本会自动扫描resource_packs目录中的PNG图片并进行透明度分析
"""

import os
import sys
from pathlib import Path
from image_alpha_analyzer import ImageAlphaAnalyzer

def find_png_files(directory):
    """查找目录中的所有PNG文件"""
    png_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith('.png'):
                png_files.append(os.path.join(root, file))
    return png_files

def test_analyzer():
    """测试透明度分析器"""
    # 查找resource_packs目录中的PNG文件
    resource_dir = "resource_packs"
    if not os.path.exists(resource_dir):
        print("❌ 未找到resource_packs目录")
        return
    
    png_files = find_png_files(resource_dir)
    
    if not png_files:
        print("❌ 在resource_packs目录中没有找到PNG文件")
        return
    
    print(f"📁 找到 {len(png_files)} 个PNG文件")
    print("\n选择要分析的文件:")
    
    for i, file_path in enumerate(png_files, 1):
        rel_path = os.path.relpath(file_path)
        print(f"  {i}. {rel_path}")
    
    try:
        choice = input(f"\n请输入文件编号 (1-{len(png_files)}) 或按回车选择第一个: ").strip()
        
        if not choice:
            index = 0
        else:
            index = int(choice) - 1
            
        if 0 <= index < len(png_files):
            selected_file = png_files[index]
            print(f"\n🎯 分析文件: {os.path.relpath(selected_file)}")
            
            # 创建分析器并运行分析
            analyzer = ImageAlphaAnalyzer(selected_file)
            analyzer.print_summary()
            
            if analyzer.has_alpha:
                print("\n📊 正在生成可视化分析图表...")
                
                # 生成输出文件名
                input_path = Path(selected_file)
                output_path = f"temps/{input_path.stem}_alpha_analysis.png"
                
                analyzer.create_comprehensive_analysis(output_path)
                print(f"✅ 分析完成！")
            else:
                print("ℹ️ 此图片没有透明度信息，无法生成分析图表")
                
        else:
            print("❌ 无效的选择")
            
    except (ValueError, KeyboardInterrupt):
        print("\n❌ 操作已取消")

if __name__ == "__main__":
    test_analyzer()