import json
from pathlib import Path
from typing import *

def get_project_name():
    project_name = ENV_PATH.read_text().splitlines()[0].split("=")[1].strip('"')
    return project_name

BBMODEL_DIR = Path(__file__).parent / "bbmodel"
NAME_MAPPING_PATH = BBMODEL_DIR / "name_mapping.json"
ENTITY_EXPORT_DIR = Path(__file__).parent / "entity"
TEMPLATES_DIR = Path(__file__).parent / "templates"
ENV_PATH = Path(__file__).parent.parent / ".env"
PROJECT_NAME = get_project_name()
RESOURCE_PACK_DIR = Path(__file__).parent.parent / "resource_packs" / PROJECT_NAME
BEHAVIOR_PACK_DIR = Path(__file__).parent.parent / "behavior_packs" / PROJECT_NAME

class Workspace:
    def __init__(self, bbmodel: str):
        # 可用数据
        self.bbmodel  = json.loads((BBMODEL_DIR / f"{bbmodel}.bbmodel").read_text())
        self.name_mapping  = json.loads(NAME_MAPPING_PATH.read_text())[bbmodel]

        # 需要构建的数据
        self.se   = None
        self.ce   = None
        self.att  = None
        self.item = None
        self.ac   = None

    def export(self):
        if self.item is not None:
            item_id: str = self.item["minecraft:item"]["description"]["identifier"]
            target_path = BEHAVIOR_PACK_DIR / "items" / f"{item_id.split(':')[-1]}.item.json"
            target_path.parent.mkdir(exist_ok=True)
            target_path.write_text(json.dumps(self.item, indent=2))
        if self.se is not None:
            se_id: str = self.se["minecraft:entity"]["description"]["identifier"]
            target_path = BEHAVIOR_PACK_DIR / "entities" / f"{se_id.split(':')[-1]}.se.json"
            target_path.parent.mkdir(exist_ok=True)
            target_path.write_text(json.dumps(self.se, indent=2))
        if self.ce is not None:
            ce_id: str = self.ce["minecraft:client_entity"]["description"]["identifier"]
            target_path = RESOURCE_PACK_DIR / "entity" / f"{ce_id.split(':')[-1]}.ce.json"
            target_path.parent.mkdir(exist_ok=True)
            target_path.write_text(json.dumps(self.ce, indent=2))
        if self.att is not None:
            att_id: str = self.att["minecraft:attachable"]["description"]["identifier"]
            target_path = RESOURCE_PACK_DIR / "attachables" / "items" / f"{att_id.split(':')[-1]}.att.json"
            target_path.parent.parent.mkdir(exist_ok=True)
            target_path.parent.mkdir(exist_ok=True)
            target_path.write_text(json.dumps(self.att, indent=2))
        if self.ac is not None:
            ac_id: str = next(self.ac["animation_controllers"].keys())
            target_path = RESOURCE_PACK_DIR / "animation_controllers" / f"{ac_id.split(':')[-1]}.ac.json"
            target_path.parent.mkdir(exist_ok=True)
            target_path.write_text(json.dumps(self.ac, indent=2))
            
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

    def replace(self, data: dict, old: str, new: str):
        return json.loads(json.dumps(data).replace(old, new))

    def setup_ce(self):
        self.ce["minecraft:client_entity"]["description"]["geometry"] = {"default": f"geometry.{self.name_mapping.get('geometry')}"}
        self.ce["minecraft:client_entity"]["description"]["textures"] = {"default": f"textures/entity/{self.name_mapping.get('textures')[0]}"}
        if len(self.name_mapping.get("animations")) > 0:
            self.ce["minecraft:client_entity"]["description"]["animations"] = { animation.split(".")[-1]: animation for animation in self.name_mapping.get("animations") }
        if len(self.name_mapping.get("particles").keys()) > 0:
            self.ce["minecraft:client_entity"]["description"]["particle_effects"] = self.name_mapping.get("particles")
        if len(self.name_mapping.get("sounds").keys()) > 0:
            self.ce["minecraft:client_entity"]["description"]["sound_effects"] = self.name_mapping.get("sounds")
    
    def setup_att(self):
        self.att["minecraft:attachable"]["description"]["geometry"] = {"default": f"geometry.{self.name_mapping.get('geometry')}"}
        self.att["minecraft:attachable"]["description"]["textures"] = {"default": f"textures/entity/{self.name_mapping.get('textures')[0]}"}
        if len(self.name_mapping.get("animations")) > 0:
            self.att["minecraft:attachable"]["description"]["animations"] = { animation.split(".")[-1]: animation for animation in self.name_mapping.get("animations") }
        if len(self.name_mapping.get("particles").keys()) > 0:
            self.att["minecraft:attachable"]["description"]["particle_effects"] = self.name_mapping.get("particles")
        if len(self.name_mapping.get("sounds").keys()) > 0:
            self.att["minecraft:attachable"]["description"]["sound_effects"] = self.name_mapping.get("sounds")

def deploy():
    """
    批量create操作以实现完全部署
    """
    bbmodels = [
        # 填写需要部署的bbmodel名称
    ]
    for bbmodel in bbmodels:
        create(Workspace(bbmodel))


def create(workspace: Workspace):
    """
    用已有的数据按照具体的需求构建CE和SE文件(对于attachable则是ITEM和ATT文件),以及可能的AC文件, 然后将其导出到相应文件夹
    Args:
        bbmodel (dict[str, Any]): bbmodel数据
        name_mapping (dict[str, Any]): 相应bbmodel的name_mapping
        cejson (dict[str, Any]): 相应bbmodel对应
    """
    # 填写构建逻辑

if __name__ == "__main__":
    deploy()