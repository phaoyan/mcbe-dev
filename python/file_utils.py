import os
from pathlib import Path

BBMODEL_DIR = Path(__file__).parent / "bbmodel"

def rename_bbmodel_files(old_str, new_str):
    """
    重命名文件夹中的所有文件，使用字符串替换规则
    
    参数:
        folder_path (str): 目标文件夹路径
        old_str (str): 需要被替换的字符串
        new_str (str): 替换为的新字符串
    """
    folder_path = BBMODEL_DIR
    # 检查文件夹是否存在
    if not os.path.isdir(folder_path):
        print(f"错误: 文件夹 '{folder_path}' 不存在")
        return
    
    # 获取文件夹中所有文件和子文件夹
    for filename in os.listdir(folder_path):
        # 构建完整文件路径
        file_path = os.path.join(folder_path, filename)
        
        # 跳过子文件夹
        if os.path.isdir(file_path):
            continue
        
        # 处理文件名(不包括扩展名)和扩展名
        file_root, file_ext = os.path.splitext(filename)
        
        # 执行字符串替换
        new_file_root = file_root.replace(old_str, new_str)
        
        # 如果文件名有变化才重命名
        if new_file_root != file_root:
            new_filename = new_file_root + file_ext
            new_file_path = os.path.join(folder_path, new_filename)
            
            # 避免文件名冲突
            counter = 1
            while os.path.exists(new_file_path):
                new_filename = f"{new_file_root}_{counter}{file_ext}"
                new_file_path = os.path.join(folder_path, new_filename)
                counter += 1
            
            # 执行重命名
            try:
                os.rename(file_path, new_file_path)
                print(f"重命名: '{filename}' -> '{new_filename}'")
            except Exception as e:
                print(f"重命名 '{filename}' 失败: {e}")

def get_bbmodel_files():
    return [file for file in BBMODEL_DIR.rglob("*.bbmodel")]

def get_bbmodel_names():
    return [file.stem for file in BBMODEL_DIR.rglob("*.bbmodel")]

if __name__ == "__main__":
  rename_bbmodel_files("-", "_")