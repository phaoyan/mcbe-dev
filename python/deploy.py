from utils import *
from typing import *
import yaml


def get_project_name():
    project_name = ENV_PATH.read_text().splitlines()[0].split("=")[1].strip('"')
    return project_name

def parse_analysis_yaml() -> dict:
    """解析analysis.yaml文件，返回数据字典"""
    with open(PYTHON_DIR / "outputs" / "analysis.yaml", 'r', encoding='utf-8') as file:
        return yaml.safe_load(file)

def deploy_analysis_yaml():
    """将analysis.yaml数据转换为JSON并部署到scripts/json/bbpack.json"""
    target_path = SCRIPTS_DIR / "json" / "bbpack.json"
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(BBPACK_DATA, indent=JSON_INDENT, ensure_ascii=False))

BBPACK_DATA = parse_analysis_yaml()
BBMODEL_JSON = json.loads(BBMODEL_JSON_PATH.read_text())
TARGET_DIRS = {
    "item": BEHAVIOR_PACK_DIR / "items",
    "se": BEHAVIOR_PACK_DIR / "entities",
    "ce": RESOURCE_PACK_DIR / "entity",
    "att": RESOURCE_PACK_DIR / "attachables" / "items",
    "ac": RESOURCE_PACK_DIR / "animation_controllers",
    "rc": RESOURCE_PACK_DIR / "render_controllers",
}
IGNORE_LIST = []


def use_template(name: str, replace: dict[str, str] = {}) -> dict:
    data = json.loads((TEMPLATES_DIR / name).read_text())
    for k, v in replace.items():
        data = str_replace(data, k, v)
    return data


def use_current(name: str, type: str) -> dict:
    target_dir = TARGET_DIRS[type]
    target_path = target_dir / f"{name}.{type}.json"
    return json.loads(target_path.read_text())


def str_replace(data, old: str, new: str) -> dict:
    return json.loads(json.dumps(data).replace(old, new))


def setup_ce(data: dict, bbmodel: str) -> dict:
    textures = BBMODEL_JSON[bbmodel].get("textures", [])
    data["minecraft:client_entity"]["description"]["geometry"] = {
        "default": f"geometry.{BBMODEL_JSON[bbmodel].get('geometry')}"
    }
    data["minecraft:client_entity"]["description"]["textures"] = {
        "default": f"textures/entity/{textures[0] if len(textures) > 0 else 'empty'}"
    }
    if len(BBMODEL_JSON[bbmodel].get("animations")) > 0:
        data["minecraft:client_entity"]["description"]["animations"] = BBMODEL_JSON[
            bbmodel
        ].get("animations")
    if len(BBMODEL_JSON[bbmodel].get("particles").keys()) > 0:
        data["minecraft:client_entity"]["description"]["particle_effects"] = (
            BBMODEL_JSON[bbmodel].get("particles")
        )
    if len(BBMODEL_JSON[bbmodel].get("sounds").keys()) > 0:
        data["minecraft:client_entity"]["description"]["sound_effects"] = BBMODEL_JSON[
            bbmodel
        ].get("sounds")
    return data


def setup_att(data: dict, bbmodel: str, texture_idx: int=0) -> dict:
    textures = BBMODEL_JSON[bbmodel].get("textures")
    data["minecraft:attachable"]["description"]["geometry"] = {
        "default": f"geometry.{BBMODEL_JSON[bbmodel].get('geometry')}"
    }
    data["minecraft:attachable"]["description"]["textures"] = {
        "default": f"textures/entity/{textures[texture_idx] if len(textures) > texture_idx else 'empty'}"
    }
    if len(BBMODEL_JSON[bbmodel].get("animations")) > 0:
        data["minecraft:attachable"]["description"]["animations"] = BBMODEL_JSON[
            bbmodel
        ].get("animations")
    if len(BBMODEL_JSON[bbmodel].get("particles").keys()) > 0:
        data["minecraft:attachable"]["description"]["particle_effects"] = BBMODEL_JSON[
            bbmodel
        ].get("particles")
    if len(BBMODEL_JSON[bbmodel].get("sounds").keys()) > 0:
        data["minecraft:attachable"]["description"]["sound_effects"] = BBMODEL_JSON[
            bbmodel
        ].get("sounds")
    return data

if __name__ == "__main__":


    import resources
    resources.main()

    import reference
    reference.main()
