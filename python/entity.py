import json
from pathlib import Path
from typing import *
import file_utils

def get_project_name():
    project_name = ENV_PATH.read_text().splitlines()[0].split("=")[1].strip('"')
    return project_name

BBMODEL_DIR = Path(__file__).parent / "bbmodel"
NAME_MAPPING_PATH = BBMODEL_DIR / "name_mapping.json"
ENTITY_EXPORT_DIR = Path(__file__).parent / "entity"
TEMPLATES_DIR = Path(__file__).parent / "templates"
TEMP_DIR = Path(__file__).parent / "temp"
ENV_PATH = Path(__file__).parent.parent / ".env"
PROJECT_NAME = get_project_name()
RESOURCE_PACK_DIR = Path(__file__).parent.parent / "resource_packs" / PROJECT_NAME
BEHAVIOR_PACK_DIR = Path(__file__).parent.parent / "behavior_packs" / PROJECT_NAME

class Workspace:
    def __init__(self, bbmodel: str = None, mode: str = "skip"):
        self.mode = mode
        if bbmodel is None:
            self.bbmodel = None
            self.name_mapping = None
        else:        
            # 可用数据
            self.bbmodel  = json.loads((BBMODEL_DIR / f"{bbmodel}.bbmodel").read_text())
            self.name_mapping  = json.loads(NAME_MAPPING_PATH.read_text())[bbmodel]

        # 需要构建的数据
        self.se   = None
        self.ce   = None
        self.att  = None
        self.item = None
        self.ac   = None
        self.rc   = None
        
        self.se_name: str   = None
        self.ce_name: str   = None
        self.att_name: str  = None
        self.item_name: str = None
        self.ac_name: str   = None
        self.rc_name: str   = None

    def export(self):
        # 确定要导出的数据和目标路径
        target_data = None
        target_path = None
        
        if self.item is not None:
            item_id: str = self.item["minecraft:item"]["description"]["identifier"]
            filename = f"{item_id.split(':')[-1]}.item.json" if self.item_name is None else f"{self.item_name}.item.json"
            target_path = BEHAVIOR_PACK_DIR / "items" / filename
            target_data = self.item
        if self.se is not None:
            se_id: str = self.se["minecraft:entity"]["description"]["identifier"]
            filename = f"{se_id.split(':')[-1]}.se.json" if self.se_name is None else f"{self.se_name}.se.json"
            target_path = BEHAVIOR_PACK_DIR / "entities" / filename
            target_data = self.se
        if self.ce is not None:
            ce_id: str = self.ce["minecraft:client_entity"]["description"]["identifier"]
            filename = f"{ce_id.split(':')[-1]}.ce.json" if self.ce_name is None else f"{self.ce_name}.ce.json"
            target_path = RESOURCE_PACK_DIR / "entity" / filename
            target_data = self.ce
        if self.att is not None:
            att_id: str = self.att["minecraft:attachable"]["description"]["identifier"]
            filename = f"{att_id.split(':')[-1]}.att.json" if self.att_name is None else f"{self.att_name}.att.json"
            target_path = RESOURCE_PACK_DIR / "attachables" / "items" / filename
            target_data = self.att
        if self.ac is not None:
            ac_id: str = next(iter(self.ac["animation_controllers"].keys()))
            filename = f"{ac_id.split(':')[-1]}.ac.json" if self.ac_name is None else f"{self.ac_name}.ac.json"
            target_path = RESOURCE_PACK_DIR / "animation_controllers" / filename
            target_data = self.ac
        if self.rc is not None:
            rc_id: str = next(iter(self.rc["render_controllers"].keys()))
            filename = f"{rc_id.split(':')[-1]}.rc.json" if self.rc_name is None else f"{self.rc_name}.rc.json"
            target_path = RESOURCE_PACK_DIR / "render_controllers" / filename
            target_data = self.rc
        
        if target_data is None or target_path is None:
            return
        
        # 处理带有路径分隔符的文件名
        if '/' in target_path.name:
            # 分割文件名中的路径部分和实际文件名
            parts = target_path.name.split('/')
            actual_filename = parts[-1]
            sub_dirs = parts[:-1]
            
            # 构建新的目标路径
            new_target_path = target_path.parent
            for dir_name in sub_dirs:
                new_target_path = new_target_path / dir_name
            
            # 确保目录存在
            new_target_path.mkdir(parents=True, exist_ok=True)
            
            # 添加实际文件名
            target_path = new_target_path / actual_filename
        
        # 处理导出模式
        if target_path.exists() and self.mode.__eq__("skip"):
            return

        if target_path.exists() and self.mode.__eq__("override"):
            target_path.parent.mkdir(parents=True, exist_ok=True)
            (TEMP_DIR / target_path.name).write_text(target_path.read_text())
            target_path.write_text(json.dumps(target_data, indent=2))
            return
        
        if target_path.exists() and self.mode.__eq__("force"):
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_text(json.dumps(target_data, indent=2))
            return
        
        # 确保目录存在
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(json.dumps(target_data, indent=2))
            
    def use_template(self, template_filename: str):
        type = template_filename.replace(".json","").split(".")[-1]
        template = json.loads((TEMPLATES_DIR / template_filename).read_text())
        if type.__eq__("item"):
            self.item = template
        elif type.__eq__("se"):
            self.se = template
        elif type.__eq__("ce"):
            self.ce = template
        elif type.__eq__("att"):
            self.att = template
        elif type.__eq__("ac"):
            self.ac  = template
        elif type.__eq__("rc"):
            self.rc  = template

    def replace(self, data: dict, old: str, new: str):
        return json.loads(json.dumps(data).replace(old, new))

    def setup_ce(self):
        self.ce["minecraft:client_entity"]["description"]["geometry"] = {"default": f"geometry.{self.name_mapping.get('geometry')}"}
        self.ce["minecraft:client_entity"]["description"]["textures"] = {"default": f"textures/entity/{self.name_mapping.get('textures')[0]}"}
        if len(self.name_mapping.get("animations")) > 0:
            self.ce["minecraft:client_entity"]["description"]["animations"] = self.name_mapping.get("animations")
        if len(self.name_mapping.get("particles").keys()) > 0:
            self.ce["minecraft:client_entity"]["description"]["particle_effects"] = self.name_mapping.get("particles")
        if len(self.name_mapping.get("sounds").keys()) > 0:
            self.ce["minecraft:client_entity"]["description"]["sound_effects"] = self.name_mapping.get("sounds")
    
    def setup_att(self):
        self.att["minecraft:attachable"]["description"]["geometry"] = {"default": f"geometry.{self.name_mapping.get('geometry')}"}
        self.att["minecraft:attachable"]["description"]["textures"] = {"default": f"textures/entity/{self.name_mapping.get('textures')[0]}"}
        if len(self.name_mapping.get("animations")) > 0:
            self.att["minecraft:attachable"]["description"]["animations"] = self.name_mapping.get("animations")
        if len(self.name_mapping.get("particles").keys()) > 0:
            self.att["minecraft:attachable"]["description"]["particle_effects"] = self.name_mapping.get("particles")
        if len(self.name_mapping.get("sounds").keys()) > 0:
            self.att["minecraft:attachable"]["description"]["sound_effects"] = self.name_mapping.get("sounds")

def deploy(bbmodels: list[str], create: Callable, mode: str = "skip"):
    for bbmodel in bbmodels:
        create(Workspace(bbmodel, mode))
