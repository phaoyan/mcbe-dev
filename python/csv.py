import csv
import json
import os
from typing import List, Dict, Any, Optional


class CSVProcessor:
    """CSV处理工具类，支持创建、修改CSV文件以及转换为JSON"""
    
    def __init__(self):
        self.outputs_dir = os.path.join(os.path.dirname(__file__), 'outputs')
        self.json_dir = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'json')
        
        # 确保输出目录存在
        os.makedirs(self.outputs_dir, exist_ok=True)
        os.makedirs(self.json_dir, exist_ok=True)
    
    def create_csv(self, 
                   filename: str, 
                   id_column: str, 
                   id_values: List[Any], 
                   columns: Dict[str, Any]) -> str:
        """
        创建新的CSV文件
        
        Args:
            filename: CSV文件名（不包含.csv扩展名）
            id_column: ID列的列名
            id_values: ID列的值列表
            columns: 其他列名和默认值的字典 {列名: 默认值}
        
        Returns:
            创建的CSV文件的完整路径
        """
        if not filename.endswith('.csv'):
            filename += '.csv'
        
        filepath = os.path.join(self.outputs_dir, filename)
        
        # 准备表头
        headers = [id_column] + list(columns.keys())
        
        # 准备数据行
        rows = []
        for id_value in id_values:
            row = [id_value]
            for column_name in columns.keys():
                row.append(columns[column_name])
            rows.append(row)
        
        # 写入CSV文件
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(headers)
            writer.writerows(rows)
        
        print(f"CSV文件已创建: {filepath}")
        return filepath
    
    def add_column(self, 
                   filename: str, 
                   column_name: str, 
                   default_value: Any = '') -> str:
        """
        为已存在的CSV文件添加新列
        
        Args:
            filename: CSV文件名
            column_name: 新列的列名
            default_value: 新列的默认值
        
        Returns:
            修改后的CSV文件路径
        """
        if not filename.endswith('.csv'):
            filename += '.csv'
        
        filepath = os.path.join(self.outputs_dir, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"CSV文件不存在: {filepath}")
        
        # 读取现有数据
        rows = []
        with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            rows = list(reader)
        
        if not rows:
            raise ValueError("CSV文件为空")
        
        # 检查列是否已存在
        headers = rows[0]
        if column_name in headers:
            print(f"警告: 列 '{column_name}' 已存在，将覆盖现有值")
            column_index = headers.index(column_name)
            # 更新现有列的值
            for i in range(1, len(rows)):
                if len(rows[i]) > column_index:
                    rows[i][column_index] = default_value
                else:
                    # 如果行数据不够长，扩展到新列
                    while len(rows[i]) <= column_index:
                        rows[i].append('')
                    rows[i][column_index] = default_value
        else:
            # 添加新列到表头
            headers.append(column_name)
            rows[0] = headers
            
            # 为每一行数据添加新列值
            for i in range(1, len(rows)):
                rows[i].append(default_value)
        
        # 写回文件
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(rows)
        
        print(f"已为CSV文件添加列 '{column_name}': {filepath}")
        return filepath
    
    def csv_to_json(self, 
                    filename: str, 
                    id_column: Optional[str] = None,
                    output_filename: Optional[str] = None) -> str:
        """
        将CSV文件转换为JSON格式，以ID为key，行数据为value
        
        Args:
            filename: CSV文件名
            id_column: 作为key的ID列名，如果为None则使用第一列
            output_filename: 输出JSON文件名，如果为None则使用CSV文件名
        
        Returns:
            生成的JSON文件路径
        """
        if not filename.endswith('.csv'):
            filename += '.csv'
        
        csv_filepath = os.path.join(self.outputs_dir, filename)
        
        if not os.path.exists(csv_filepath):
            raise FileNotFoundError(f"CSV文件不存在: {csv_filepath}")
        
        # 确定输出文件名
        if output_filename is None:
            output_filename = filename.replace('.csv', '.json')
        elif not output_filename.endswith('.json'):
            output_filename += '.json'
        
        json_filepath = os.path.join(self.json_dir, output_filename)
        
        # 读取CSV数据
        data = {}
        with open(csv_filepath, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            headers = reader.fieldnames
            
            if not headers:
                raise ValueError("CSV文件没有表头")
            
            # 确定ID列
            if id_column is None:
                id_column = headers[0]
            elif id_column not in headers:
                raise ValueError(f"指定的ID列 '{id_column}' 不存在于CSV文件中")
            
            # 转换数据
            for row in reader:
                id_value = row[id_column]
                # 创建不包含ID列的行数据
                row_data = {k: v for k, v in row.items() if k != id_column}
                data[id_value] = row_data
        
        # 写入JSON文件
        with open(json_filepath, 'w', encoding='utf-8') as jsonfile:
            json.dump(data, jsonfile, ensure_ascii=False, indent=2)
        
        print(f"JSON文件已生成: {json_filepath}")
        return json_filepath
    
    def get_csv_info(self, filename: str) -> Dict[str, Any]:
        """
        获取CSV文件的基本信息
        
        Args:
            filename: CSV文件名
        
        Returns:
            包含文件信息的字典
        """
        if not filename.endswith('.csv'):
            filename += '.csv'
        
        filepath = os.path.join(self.outputs_dir, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"CSV文件不存在: {filepath}")
        
        with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            rows = list(reader)
        
        if not rows:
            return {
                'filename': filename,
                'filepath': filepath,
                'headers': [],
                'row_count': 0,
                'column_count': 0
            }
        
        headers = rows[0]
        row_count = len(rows) - 1  # 减去表头行
        column_count = len(headers)
        
        return {
            'filename': filename,
            'filepath': filepath,
            'headers': headers,
            'row_count': row_count,
            'column_count': column_count
        }


# 便捷函数
def create_csv(filename: str, 
               id_column: str, 
               id_values: List[Any], 
               columns: Dict[str, Any]) -> str:
    """创建CSV文件的便捷函数"""
    processor = CSVProcessor()
    return processor.create_csv(filename, id_column, id_values, columns)


def add_column(filename: str, 
               column_name: str, 
               default_value: Any = '') -> str:
    """添加列的便捷函数"""
    processor = CSVProcessor()
    return processor.add_column(filename, column_name, default_value)


def csv_to_json(filename: str, 
                id_column: Optional[str] = None,
                output_filename: Optional[str] = None) -> str:
    """CSV转JSON的便捷函数"""
    processor = CSVProcessor()
    return processor.csv_to_json(filename, id_column, output_filename)


def get_csv_info(filename: str) -> Dict[str, Any]:
    """获取CSV信息的便捷函数"""
    processor = CSVProcessor()
    return processor.get_csv_info(filename)


# 示例用法
if __name__ == "__main__":
    # 创建CSV处理器实例
    processor = CSVProcessor()
    
    # 示例1: 创建新的CSV文件
    print("=== 示例1: 创建新CSV文件 ===")
    id_list = ['item_001', 'item_002', 'item_003', 'item_004']
    columns_data = {
        'name': '默认名称',
        'type': 'default_type',
        'value': 0,
        'description': '默认描述'
    }
    
    csv_file = processor.create_csv('test_items', 'id', id_list, columns_data)
    
    # 示例2: 为现有CSV添加新列
    print("\n=== 示例2: 添加新列 ===")
    processor.add_column('test_items', 'category', '未分类')
    processor.add_column('test_items', 'price', 10.0)
    
    # 示例3: 获取CSV文件信息
    print("\n=== 示例3: 获取CSV信息 ===")
    info = processor.get_csv_info('test_items')
    print(f"文件信息: {info}")
    
    # 示例4: 转换为JSON
    print("\n=== 示例4: 转换为JSON ===")
    json_file = processor.csv_to_json('test_items', 'id', 'test_items_data')
    
    print("\n所有操作完成！") 