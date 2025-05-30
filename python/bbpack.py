import json
import shutil
from pathlib import Path
from typing import List, Set
from utils import *

def check_particle_references() -> None:
    """
    检查bbpack文件夹中bbmodel文件与particle.json文件之间的引用关系。
    打印出所有找不到对应particle.json文件的异常情况。
    
    Args:
        bbpack_dir: bbpack文件夹的路径
    """
    bbpack_path = Path(PYTHON_DIR / "bbpack")
    
    print("开始检查bbmodel与particle.json文件的引用关系...")
    print("="*60)
    
    total_dirs = 0
    total_missing = 0
    missing_references = []  # 存储所有缺失的引用信息
    
    # 遍历bbpack下的所有子目录
    for subdir in bbpack_path.iterdir():
        if not subdir.is_dir():
            continue
            
        total_dirs += 1
        print(f"\n检查目录: {subdir.name}")
        
        # 获取目录中的所有bbmodel文件和particle.json文件
        bbmodel_files = list(subdir.glob("*.bbmodel"))
        particle_files = list(subdir.glob("*.particle.json"))
        
        if not bbmodel_files:
            print(f"  警告：目录中没有找到.bbmodel文件")
            continue
            
        # 提取所有particle.json文件的ID
        available_particle_ids = get_particle_ids(particle_files)
        print(f"  找到 {len(particle_files)} 个particle.json文件")
        if particle_files:
            print(f"  可用的粒子ID: {available_particle_ids}")
        
        # 检查每个bbmodel文件
        for bbmodel_file in bbmodel_files:
            print(f"  检查bbmodel: {bbmodel_file.name}")
            missing_ids = check_single_bbmodel(bbmodel_file, available_particle_ids)
            
            if missing_ids:
                total_missing += len(missing_ids)
                print(f"    ❌ 找到 {len(missing_ids)} 个缺失的粒子引用")
                # 记录缺失信息
                for missing_id in missing_ids:
                    missing_references.append({
                        'directory': subdir.name,
                        'bbmodel_file': bbmodel_file.name,
                        'missing_id': missing_id
                    })
            else:
                print(f"    ✅ 所有粒子引用都正常")
    
    print("\n" + "="*60)
    print(f"检查完成！")
    print(f"总共检查了 {total_dirs} 个目录")
    print(f"总共发现 {total_missing} 个缺失的粒子引用")
    
    # 统一打印所有缺失的引用
    if missing_references:
        print("\n" + "="*60)
        print("缺失的粒子引用详细列表：")
        print("="*60)
        
        # 按目录分组显示
        current_dir = ""
        for ref in missing_references:
            if ref['directory'] != current_dir:
                current_dir = ref['directory']
                print(f"\n📁 目录: {current_dir}")
            print(f"  🔸 文件: {ref['bbmodel_file']}")
            print(f"    ❌ 缺失ID: {ref['missing_id']}")
        
        print(f"\n" + "="*60)
        print("缺失引用汇总：")
        print("="*60)
        
        # 按目录统计缺失数量
        dir_stats = {}
        for ref in missing_references:
            if ref['directory'] not in dir_stats:
                dir_stats[ref['directory']] = 0
            dir_stats[ref['directory']] += 1
        
        for directory, count in sorted(dir_stats.items()):
            print(f"  📂 {directory}: {count} 个缺失引用")
            
    else:
        print("\n🎉 所有bbmodel文件的粒子引用都正常！")


def get_particle_ids(particle_files: List[Path]) -> Set[str]:
    """
    从particle.json文件列表中提取所有的粒子ID（去掉命名空间）
    
    Args:
        particle_files: particle.json文件路径列表
        
    Returns:
        包含所有可用粒子ID的集合
    """
    particle_ids = set()
    
    for particle_file in particle_files:
        try:
            with open(particle_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # 获取identifier
            identifier = data.get('particle_effect', {}).get('description', {}).get('identifier', '')
            
            # 去掉命名空间 (pm_bc:)
            if ':' in identifier:
                particle_id = identifier.split(':', 1)[1]
            else:
                particle_id = identifier
                
            if particle_id:
                particle_ids.add(particle_id)
                
        except Exception as e:
            print(f"    警告：读取particle文件 {particle_file.name} 时出错: {e}")
            
    return particle_ids


def check_single_bbmodel(bbmodel_file: Path, available_particle_ids: Set[str]) -> List[str]:
    """
    检查单个bbmodel文件中的粒子引用
    
    Args:
        bbmodel_file: bbmodel文件路径
        available_particle_ids: 可用的粒子ID集合
        
    Returns:
        缺失的粒子ID列表
    """
    missing_ids = []
    
    try:
        with open(bbmodel_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # 检查是否有animations
        animations = data.get('animations', [])
        if not animations:
            print(f"    信息：{bbmodel_file.name} 没有animations，这是正常的")
            return missing_ids
            
        # 遍历animations
        for animation in animations:
            if not isinstance(animation, dict):
                continue
                
            # 检查animators
            animators = animation.get('animators', {})
            if not isinstance(animators, dict):
                continue
                
            # 检查effects
            effects = animators.get('effects', {})
            if not isinstance(effects, dict):
                continue
                
            # 检查keyframes
            keyframes = effects.get('keyframes', [])
            if not isinstance(keyframes, list):
                continue
                
            # 遍历keyframes
            for keyframe in keyframes:
                if not isinstance(keyframe, dict):
                    continue
                    
                # 检查channel是否为particle
                if keyframe.get('channel') != 'particle':
                    continue
                    
                # 检查data_points
                data_points = keyframe.get('data_points', [])
                if not isinstance(data_points, list):
                    continue
                    
                # 遍历data_points
                for data_point in data_points:
                    if not isinstance(data_point, dict):
                        continue
                        
                    # 获取effect ID
                    effect_id = data_point.get('effect', '')
                    if effect_id and effect_id not in available_particle_ids:
                        if effect_id not in missing_ids:  # 避免重复
                            missing_ids.append(effect_id)
                            
    except Exception as e:
        print(f"    错误：读取bbmodel文件 {bbmodel_file.name} 时出错: {e}")
        
    return missing_ids


def copy_bbpack_files() -> None:
    """
    将bbpack文件夹中每个子文件夹的文件复制到对应目录：
    - 将所有.particle.json文件复制到RESOURCE_PACK_DIR/particles文件夹
    
    注意：bbmodel文件不再需要复制，因为处理程序现在直接从bbpack文件夹读取
    """
    bbpack_path = Path(PYTHON_DIR / "bbpack")
    
    rename_bbmodel_files()

    if not bbpack_path.exists():
        print("❌ bbpack文件夹不存在！")
        return
    
    # 确保目标目录存在
    particles_target_dir = RESOURCE_PACK_DIR / "particles"
    particles_target_dir.mkdir(parents=True, exist_ok=True)
    
    print("开始复制bbpack中的particle文件...")
    print("="*60)
    
    # 清空particles文件夹中的.particle.json文件
    print("🧹 正在清空particles文件夹...")
    particle_files_to_remove = list(particles_target_dir.glob("*.particle.json"))
    removed_particle_count = 0
    for file_to_remove in particle_files_to_remove:
        try:
            file_to_remove.unlink()
            removed_particle_count += 1
        except Exception as e:
            print(f"  ⚠️  删除文件失败 {file_to_remove.name}: {e}")
    if removed_particle_count > 0:
        print(f"  🗑️  删除了 {removed_particle_count} 个旧的particle文件")
    else:
        print(f"  ℹ️  particles文件夹中没有旧文件需要删除")
    
    print("\n📁 开始复制particle文件...")
    
    total_dirs = 0
    total_particle_files = 0
    
    # 遍历bbpack下的所有子目录
    for subdir in bbpack_path.iterdir():
        if not subdir.is_dir():
            continue
            
        total_dirs += 1
        print(f"\n处理目录: {subdir.name}")
        
        # 获取目录中的所有bbmodel文件和particle.json文件
        bbmodel_files = list(subdir.glob("*.bbmodel"))
        particle_files = list(subdir.glob("*.particle.json"))
        
        # 复制particle.json文件
        for particle_file in particle_files:
            try:
                target_path = particles_target_dir / particle_file.name
                shutil.copy2(particle_file, target_path)
                print(f"  ✅ 复制particle: {particle_file.name} -> particles/")
                total_particle_files += 1
            except Exception as e:
                print(f"  ❌ 复制particle失败 {particle_file.name}: {e}")
        
        # 报告该目录的统计信息
        if bbmodel_files or particle_files:
            print(f"  📊 目录统计: {len(bbmodel_files)} 个bbmodel文件(无需复制), {len(particle_files)} 个particle文件")
        else:
            print(f"  ℹ️  目录中没有找到bbmodel或particle文件")
    
    print("\n" + "="*60)
    print(f"复制完成！")
    print(f"总共处理了 {total_dirs} 个目录")
    print(f"复制了 {total_particle_files} 个particle文件到 {particles_target_dir}")
    print(f"ℹ️  bbmodel文件无需复制，处理程序将直接从bbpack文件夹读取")


def rename_bbmodel_files() -> None:
    """
    对于bbpack中的所有子文件夹，将其下的bbmodel文件重命名为和文件夹名一致
    """
    bbpack_path = Path(PYTHON_DIR / "bbpack")
    if not bbpack_path.exists():
        print("❌ bbpack文件夹不存在！")
        return
    print("开始重命名bbmodel文件...")
    print("="*60)
    total_dirs = 0
    total_renamed = 0
    # 遍历bbpack下的所有子目录
    for subdir in bbpack_path.iterdir():
        if not subdir.is_dir():
            continue
            
        total_dirs += 1
        print(f"\n处理目录: {subdir.name}")
        
        # 获取目录中的所有bbmodel文件
        bbmodel_files = list(subdir.glob("*.bbmodel"))
        
        if not bbmodel_files:
            print(f"  ℹ️  目录中没有找到bbmodel文件")
            continue
        elif len(bbmodel_files) > 1:
            print(f"  ⚠️  目录中找到多个bbmodel文件: {[f.name for f in bbmodel_files]}")
            print(f"  ⚠️  跳过重命名以避免冲突")
            continue
        
        # 只有一个bbmodel文件，进行重命名
        bbmodel_file = bbmodel_files[0]
        expected_name = f"{subdir.name}.bbmodel"
        
        if bbmodel_file.name == expected_name:
            print(f"  ✅ 文件名已正确: {bbmodel_file.name}")
        else:
            try:
                new_path = subdir / expected_name
                bbmodel_file.rename(new_path)
                print(f"  🔄 重命名: {bbmodel_file.name} -> {expected_name}")
                total_renamed += 1
            except Exception as e:
                print(f"  ❌ 重命名失败 {bbmodel_file.name}: {e}")
    
    print("\n" + "="*60)
    print(f"重命名完成！")
    print(f"总共处理了 {total_dirs} 个目录")
    print(f"成功重命名了 {total_renamed} 个bbmodel文件")


if __name__ == "__main__":
    # check_particle_references()
    copy_bbpack_files()
    
