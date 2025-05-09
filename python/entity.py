from utils import *
from typing import *

def get_project_name():
    project_name = ENV_PATH.read_text().splitlines()[0].split("=")[1].strip('"')
    return project_name

NAME_MAPPING  = json.loads(NAME_MAPPING_PATH.read_text())
BBMODEL_NAMES = [bbmodel.stem for bbmodel in BBMODEL_DIR.rglob("*.bbmodel")]
BBMODEL_DATA  = {
    bbmodel.stem: json.loads((BBMODEL_DIR / bbmodel.name).read_text())
    for bbmodel in BBMODEL_DIR.rglob("*.bbmodel")
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

def use_current(name: str, type: str) -> dict:
    target_dir  = TARGET_DIRS[type]
    target_path = target_dir / f"{name}.{type}.json"
    return json.loads(target_path.read_text())

def str_replace(data, old: str, new: str) -> dict:
    return json.loads(json.dumps(data).replace(old, new))

def setup_ce(data: dict, bbmodel: str) -> dict:
    textures = NAME_MAPPING[bbmodel].get('textures')
    data["minecraft:client_entity"]["description"]["geometry"] = {"default": f"geometry.{NAME_MAPPING[bbmodel].get('geometry')}"}
    data["minecraft:client_entity"]["description"]["textures"] = {"default": f"textures/entity/{textures[0] if len(textures) > 0 else 'empty'}"}
    if len(NAME_MAPPING[bbmodel].get("animations")) > 0:
        data["minecraft:client_entity"]["description"]["animations"] = NAME_MAPPING[bbmodel].get("animations")
    if len(NAME_MAPPING[bbmodel].get("particles").keys()) > 0:
        data["minecraft:client_entity"]["description"]["particle_effects"] = NAME_MAPPING[bbmodel].get("particles")
    if len(NAME_MAPPING[bbmodel].get("sounds").keys()) > 0:
        data["minecraft:client_entity"]["description"]["sound_effects"] = NAME_MAPPING[bbmodel].get("sounds")
    return data

def setup_att(data: dict, bbmodel: str) -> dict:
    textures = NAME_MAPPING[bbmodel].get('textures')
    data["minecraft:attachable"]["description"]["geometry"] = {"default": f"geometry.{NAME_MAPPING[bbmodel].get('geometry')}"}
    data["minecraft:attachable"]["description"]["textures"] = {"default": f"textures/entity/{textures[0] if len(textures) > 0 else 'empty'}"}
    if len(NAME_MAPPING[bbmodel].get("animations")) > 0:
        data["minecraft:attachable"]["description"]["animations"] = NAME_MAPPING[bbmodel].get("animations")
    if len(NAME_MAPPING[bbmodel].get("particles").keys()) > 0:
        data["minecraft:attachable"]["description"]["particle_effects"] = NAME_MAPPING[bbmodel].get("particles")
    if len(NAME_MAPPING[bbmodel].get("sounds").keys()) > 0:
        data["minecraft:attachable"]["description"]["sound_effects"] = NAME_MAPPING[bbmodel].get("sounds")
    return data

def comp_se(data: dict, name: str):
    comps: dict[str, dict] = json.loads((TEMPLATES_DIR / name).read_text())
    for k, v in comps.items():
        data["minecraft:entity"]["component_groups"][k] |= v
    return data

def comp_item(data: dict, name: str):
    comps: dict[str, dict] = json.loads((TEMPLATES_DIR / name).read_text())
    for k, v in comps.items():
        data["minecraft:item"]["component_groups"][k] |= v
    return data

def export(data, name: str, type: str):
    filename = f"{name}.{type}.json"
    target_path = TARGET_DIRS[type] / filename
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(data, indent=JSON_INDENT))
    
    
def main():
    for bbmodel in BBMODEL_NAMES:
        se_data = use_template("basic.se.json")
        se_data = str_replace(se_data, "ID", bbmodel)
        export(se_data, bbmodel, "se")
        ce_data = use_template("basic.ce.json")
        ce_data = str_replace(ce_data, "ID", bbmodel)
        ce_data = setup_ce(ce_data, bbmodel)
        export(ce_data, bbmodel, "ce")
        

if __name__ == "__main__":
    main()