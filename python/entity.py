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
TEMP_DIR = Path(__file__).parent / "temp"
ENV_PATH = Path(__file__).parent.parent / ".env"
PROJECT_NAME = get_project_name()
RESOURCE_PACK_DIR = Path(__file__).parent.parent / "resource_packs" / PROJECT_NAME
BEHAVIOR_PACK_DIR = Path(__file__).parent.parent / "behavior_packs" / PROJECT_NAME

NAME_MAPPING  = json.loads(NAME_MAPPING_PATH.read_text())
BBMODEL_NAMES = [bbmodel.stem for bbmodel in BBMODEL_DIR.iterdir()]
BBMODEL_DATA  = {
    bbmodel.stem: json.loads((BBMODEL_DIR / bbmodel.name).read_text())
    for bbmodel in BBMODEL_DIR.iterdir()
}
TARGET_DIRS = {
    "item": BEHAVIOR_PACK_DIR / "items",
    "se":   BEHAVIOR_PACK_DIR / "entities",
    "ce":   RESOURCE_PACK_DIR / "entity",
    "att":  RESOURCE_PACK_DIR / "attachables" / "items",
    "ac":   RESOURCE_PACK_DIR / "animation_controllers",
    "rc":   RESOURCE_PACK_DIR / "render_controllers",
}

def use_template(name: str) -> dict:
    return json.loads((TEMPLATES_DIR / name).read_text())

def str_replace(data, old: str, new: str) -> dict:
    return json.loads(json.dumps(data).replace(old, new))

def setup_ce(data: dict, bbmodel: str) -> dict:
    data["minecraft:client_entity"]["description"]["geometry"] = {"default": f"geometry.{NAME_MAPPING[bbmodel].get('geometry')}"}
    data["minecraft:client_entity"]["description"]["textures"] = {"default": f"textures/entity/{NAME_MAPPING[bbmodel].get('textures')[0]}"}
    if len(NAME_MAPPING[bbmodel].get("animations")) > 0:
        data["minecraft:client_entity"]["description"]["animations"] = NAME_MAPPING[bbmodel].get("animations")
    if len(NAME_MAPPING[bbmodel].get("particles").keys()) > 0:
        data["minecraft:client_entity"]["description"]["particle_effects"] = NAME_MAPPING[bbmodel].get("particles")
    if len(NAME_MAPPING[bbmodel].get("sounds").keys()) > 0:
        data["minecraft:client_entity"]["description"]["sound_effects"] = NAME_MAPPING[bbmodel].get("sounds")
    return data

def setup_att(data: dict, bbmodel: str) -> dict:
    data["minecraft:attachable"]["description"]["geometry"] = {"default": f"geometry.{NAME_MAPPING[bbmodel].get('geometry')}"}
    data["minecraft:attachable"]["description"]["textures"] = {"default": f"textures/entity/{NAME_MAPPING[bbmodel].get('textures')[0]}"}
    if len(NAME_MAPPING[bbmodel].get("animations")) > 0:
        data["minecraft:attachable"]["description"]["animations"] = NAME_MAPPING[bbmodel].get("animations")
    if len(NAME_MAPPING[bbmodel].get("particles").keys()) > 0:
        data["minecraft:attachable"]["description"]["particle_effects"] = NAME_MAPPING[bbmodel].get("particles")
    if len(NAME_MAPPING[bbmodel].get("sounds").keys()) > 0:
        data["minecraft:attachable"]["description"]["sound_effects"] = NAME_MAPPING[bbmodel].get("sounds")
    return data

def export(data, name: str, type: str):
    filename = f"{name}.{type}.json"
    target_path = TARGET_DIRS[type] / filename
    target_path.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(data, indent=2))
    
    
def main():
    pass

if __name__ == "__main__":
    main()