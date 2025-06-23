from utils import *
#!/usr/bin/env python3
import yaml
import json
import os

def item_id_refs():
    item_ids = {}
    for item_file in Path(BEHAVIOR_PACK_DIR).rglob("*.item.json"):
        item_data = json.loads(item_file.read_text())
        item_id = item_data["minecraft:item"]["description"]["identifier"]
        item_ids[item_id.split(":")[-1]] = item_id
    (SCRIPTS_DIR / "json" / "item_ids.json").write_text(json.dumps(item_ids, indent=JSON_INDENT))


def entity_id_refs():
    entity_ids = {}
    for entity_file in Path(BEHAVIOR_PACK_DIR).rglob("*.se.json"):
        entity_data = json.loads(entity_file.read_text())
        entity_id = entity_data["minecraft:entity"]["description"]["identifier"]
        entity_ids[entity_id.split(":")[-1]] = entity_id
    (SCRIPTS_DIR / "json" / "entity_ids.json").write_text(json.dumps(entity_ids, indent=JSON_INDENT))

def animation_id_refs():
    animation_ids = {}
    for animation_file in RESOURCE_PACK_DIR.rglob("*.animation.json"):
        animation_data = json.loads(animation_file.read_text())
        animation_ids |= {animation.replace("animation.", "").replace(".","_"):animation for animation in animation_data["animations"].keys()}
    (SCRIPTS_DIR / "json" / "particle_ids.json").write_text(json.dumps(animation_ids, indent=JSON_INDENT))

def particle_id_refs():
    particle_ids = {}
    for particle_file in RESOURCE_PACK_DIR.rglob("*.particle.json"):
        particle_data = json.loads(particle_file.read_text())
        particle_id = particle_data["particle_effect"]["description"]["identifier"]
        particle_ids[particle_id.split(":")[-1]] = particle_id
    (SCRIPTS_DIR / "json" / "particle_ids.json").write_text(json.dumps(particle_ids, indent=JSON_INDENT))

def sound_id_refs():
    sound_ids = {}
    for sound_def in RESOURCE_PACK_DIR.rglob("sound_definitions.json"):
        sound_data = json.loads(sound_def.read_text())
        for sound_id in sound_data["sound_definitions"].keys():
            sound_ids[sound_id.replace(".","_")] = sound_id
    (SCRIPTS_DIR / "json" / "sound_ids.json").write_text(json.dumps(sound_ids, indent=JSON_INDENT))

def convert_magics_to_json():
    """将analysis.yaml中的magics字段转换为JSON格式"""
    
    # 读取analysis.yaml文件
    analysis_path = os.path.join(os.path.dirname(__file__), 'outputs', 'analysis.yaml')
    
    try:
        with open(analysis_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"错误：找不到文件 {analysis_path}")
        return
    except yaml.YAMLError as e:
        print(f"错误：解析YAML文件失败 - {e}")
        return
    
    # 提取magics字段
    if 'magics' not in data:
        print("错误：在analysis.yaml中未找到magics字段")
        return
    
    magics = data['magics']
    
    # 确保输出目录存在
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'json')
    os.makedirs(output_dir, exist_ok=True)
    
    # 输出JSON文件
    output_path = os.path.join(output_dir, 'magics.json')
    
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(magics, f, ensure_ascii=False, indent=2)
        
        print(f"成功：magics数据已转换并保存到 {output_path}")
        print(f"包含 {len(magics)} 个魔法分类")
        
        # 显示统计信息
        total_spells = sum(len(spells) for spells in magics.values())
        print(f"总共 {total_spells} 个魔法技能")
        
    except Exception as e:
        print(f"错误：写入JSON文件失败 - {e}")


def main():
    item_id_refs()
    entity_id_refs()
    animation_id_refs()
    particle_id_refs()
    sound_id_refs()
    convert_magics_to_json()

if __name__ == "__main__":
    main()