import os
from utils import *

def generate_main_ts(project_dir):
    # 校验目录有效性
    if not os.path.isdir(project_dir):
        print(f"Error: {project_dir} is not a valid directory.")
        return

    # 标准化路径并获取工程名称
    project_dir = os.path.abspath(project_dir)
    project_name = os.path.basename(project_dir)
    main_ts_path = os.path.join(project_dir, 'main.ts')

    imports = []

    # 遍历所有.ts文件
    for root, dirs, files in os.walk(project_dir):
        for file in files:
            if file.startswith('main.ts'):
                continue
            if file.endswith('.ts'):
                abs_file_path = os.path.join(root, file)
                
                # 获取相对于工程目录的路径
                rel_path = os.path.relpath(abs_file_path, start=project_dir)
                # 统一路径分隔符为正斜杠
                rel_path = rel_path.replace(os.path.sep, '/')
                # 移除文件扩展名
                rel_path_no_ext = os.path.splitext(rel_path)[0]
                # 生成完整导入路径
                import_path = f"./{rel_path_no_ext}"
                
                imports.append(f'import "{import_path}";')

    # 写入main.ts文件
    with open(main_ts_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(imports))

    print(f"成功生成 main.ts，共导入 {len(imports)} 个文件。")
    print(f"文件位置: {main_ts_path}")

if __name__ == '__main__':
    generate_main_ts(project_dir=str(SCRIPTS_DIR.resolve()))