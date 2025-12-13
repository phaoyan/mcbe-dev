#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import zipfile
import shutil
from pathlib import Path


def extract_features():
    """
    将 root_feature_features.zip 解压到 behavior_packs/juumii_sky/features 目录
    """
    # 获取项目根目录（当前脚本所在目录的上一级）
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    zip_file = project_root / 'root_feature_features.zip'
    target_dir = project_root / 'behavior_packs' / 'juumii_sky'
    
    # 检查 zip 文件是否存在
    if not zip_file.exists():
        print(f'错误: 找不到文件 {zip_file}', file=sys.stderr)
        sys.exit(1)
    
    # 确保目标目录存在
    if not target_dir.exists():
        target_dir.mkdir(parents=True, exist_ok=True)
        print(f'创建目标目录: {target_dir}')
    
    # 删除已有的features文件夹
    features_dir = target_dir / 'features'
    if features_dir.exists():
        shutil.rmtree(features_dir)
        print(f'已删除已有的 features 文件夹: {features_dir}')
    
    try:
        print(f'正在解压 {zip_file} 到 {target_dir}...')
        with zipfile.ZipFile(zip_file, 'r') as zip_ref:
            zip_ref.extractall(target_dir)
        print('✅ 解压完成！')
    except Exception as error:
        print(f'解压失败: {error}', file=sys.stderr)
        sys.exit(1)
    
    # 删除zip文件
    if zip_file.exists():
        zip_file.unlink()
        print(f'已删除zip文件: {zip_file}')


# 如果直接运行此文件
if __name__ == '__main__':
    extract_features()
