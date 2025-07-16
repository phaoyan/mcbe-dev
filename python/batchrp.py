from operator import ge
from utils import *
from typing import *

BBMODEL_JSON = json.loads(BBMODEL_JSON_PATH.read_text())
IGNORE_LIST = []

def bbgeo(bbmodel: str):
    return BBMODEL_JSON[bbmodel]["geometry"]

def bbtxr(bbmodel: str):
    return BBMODEL_JSON[bbmodel]["textures"]

def bbanimations(bbmodel: str):
    return BBMODEL_JSON[bbmodel].get("animations", {})

def bbparticles(bbmodel: str):
    return BBMODEL_JSON[bbmodel].get("particle_effects", {})

def bbsounds(bbmodel: str):
    return BBMODEL_JSON[bbmodel].get("sound_effects", {})

def desc(data: dict):
    is_ce  = data.get("minecraft:client_entity") is not None
    if is_ce:
        return data["minecraft:client_entity"]["description"]
    else:
        return data["minecraft:attachable"]["description"]

def init(type: str, type_id: str):
    data = {}
    data["format_version"] = "1.21.10"
    if type == "ce":
        data["minecraft:client_entity"] = {}
        data["minecraft:client_entity"]["description"] = {}
    elif type == "att":
        data["minecraft:attachable"] = {}
        data["minecraft:attachable"]["description"] = {}
    desc_data = desc(data)  # 获取description对象
    desc_data["identifier"] = f"{NAME_SPACE}:{type_id}"
    desc_data["textures"] = {}
    desc_data["geometry"] = {}
    desc_data["materials"] = {}
    desc_data["render_controllers"] = []
    desc_data["animations"] = {}
    desc_data["particle_effects"] = {}
    desc_data["sound_effects"] = {}
    desc_data["scripts"] = {}
    return data  # 返回完整的data对象

# geometry
def geo(data: dict) -> dict:
    return desc(data).get("geometry")

# textures
def txr(data: dict) -> dict:
    return desc(data).get("textures")

# materials
def mtr(data: dict) -> dict:
    return desc(data).get("materials")

# render_controllers
def rc(data: dict) -> list:
    return desc(data).get("render_controllers")

def scripts(data: dict) -> dict:
    return desc(data).get("scripts")

def geo_path(geo: str) -> str:
    return f"geometry.{geo}"

def txr_path(txr: str) -> str:
    return f"textures/entity/{txr}"

def export(data, name: str):
    type = "ce" if data.get("minecraft:client_entity") is not None else "att"
    filename = f"{name}.{type}.json"
    if filename in IGNORE_LIST:
        return
    desc_data = desc(data)
    if len(desc_data.get("animations").keys()) == 0:
        del desc_data["animations"]
    if len(desc_data.get("particle_effects").keys()) == 0:
        del desc_data["particle_effects"] 
    if len(desc_data.get("sound_effects").keys()) == 0:
        del desc_data["sound_effects"]
    if len(desc_data.get("scripts").keys()) == 0:
        del desc_data["scripts"]

    target_path = \
        RESOURCE_PACK_DIR / "entity" / filename if type == "ce" else \
        RESOURCE_PACK_DIR / "attachables" / "items" / filename
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(data, indent=JSON_INDENT))


def setup_entity(bbmodel: str):
    data = init("ce", f"{NAME_SPACE}:{bbmodel}")
    geo(data)["default"] = geo_path(bbgeo(bbmodel))
    txr(data)["default"] = txr_path(bbtxr(bbmodel)[0])
    mtr(data)["default"] = "entity_alphatest"
    desc(data)["animations"] |= bbanimations(bbmodel)
    desc(data)["particle_effects"] |= bbparticles(bbmodel)
    desc(data)["sound_effects"] |= bbsounds(bbmodel)
    rc(data).append("controller.render.default")
    return data

def setup_mobs(bbmodel: str, ac: str):
    data = setup_entity(bbmodel)
    desc(data)["animations"] |= {"ctrl": ac}
    scripts(data)["animate"] = ["ctrl"]
    return data

def setup_attachable(type_id: str, bbmodel_tpp: str, bbmodel_fpp: str):
    data = init("att", type_id)
    geo(data)["tpp"] = geo_path(bbgeo(bbmodel_tpp))
    geo(data)["fpp"] = geo_path(bbgeo(bbmodel_fpp))
    txr(data)["tpp"] = txr_path(bbtxr(bbmodel_tpp)[0])
    txr(data)["fpp"] = txr_path(bbtxr(bbmodel_fpp)[0])
    mtr(data)["default"] = "entity_alphatest"
    desc(data)["animations"] |= bbanimations(bbmodel_fpp)
    desc(data)["animations"] |= bbanimations(bbmodel_tpp)
    rc(data).extend([
        {"controller.render.tpp": "!c.is_first_person"},
        {"controller.render.fpp": "c.is_first_person"}
    ])
    scripts(data)["parent_setup"] = "t.player_attacking = v.attack_time; t.is_using_item = q.is_using_item;"
    return data

def setup_void_rclick(type_id: str, bbmodel_fpp: str, animation: str):
    data = init("att", type_id)
    geo(data)["default"] = geo_path(bbgeo(bbmodel_fpp))
    txr(data)["default"] = txr_path(bbtxr(bbmodel_fpp)[0])
    mtr(data)["default"] = "entity_alphatest"
    desc(data)["animations"] = {
        "ctrl_fpp": "controller.animation.rclick_fpp",
        "rclick_fpp": f"animation.{bbmodel_fpp}.{animation}",
        "idle_fpp": f"animation.{bbmodel_fpp}.idle_fpp",
    }
    rc(data).append({"controller.render.default": "c.is_first_person"})
    scripts(data)["parent_setup"] = "t.player_attacking = v.attack_time; t.is_using_item = q.is_using_item;"
    scripts(data)["animate"] = [{"ctrl": "c.is_first_person"}]
    return data

def setup_rclick(type_id: str, bbmodel_tpp: str, bbmodel_fpp: str):
    data = setup_attachable(type_id, bbmodel_tpp, bbmodel_fpp)
    anims = desc(data).get("animations")
    if anims.get("rclick_fpp") is None or anims.get("idle_fpp") is None:
        print(f"Warning: {type_id} has no rclick_fpp or idle_fpp")
        
    desc(data)["animations"] = {
        "ctrl_fpp": "controller.animation.rclick_fpp",
        "rclick_fpp": f"animation.{bbmodel_fpp}.rclick_fpp",
        "idle_fpp": f"animation.{bbmodel_fpp}.idle_fpp",
    }
    scripts(data)["animate"] = [{"ctrl_fpp": "c.is_first_person"}]
    return data

def setup_lclick(type_id: str, bbmodel_tpp: str, bbmodel_fpp: str):
    data = setup_attachable(type_id, bbmodel_tpp, bbmodel_fpp)
    anims = desc(data).get("animations")
    if anims.get("lclick_fpp") is None or anims.get("idle_fpp") is None:
        print(f"Warning: {type_id} has no lclick_fpp or idle_fpp")

    desc(data)["animations"] = {
        "ctrl_fpp": "controller.animation.lclick_fpp",
        "lclick_fpp": f"animation.{bbmodel_fpp}.lclick_fpp",
        "idle_fpp": f"animation.{bbmodel_fpp}.idle_fpp",
    }
    scripts(data)["animate"] = [{"ctrl_fpp": "c.is_first_person"}]
    return data

def setup_lrclick(type_id: str, bbmodel_tpp: str, bbmodel_fpp: str):
    data = setup_attachable(type_id, bbmodel_tpp, bbmodel_fpp)
    anims = desc(data).get("animations")
    if anims.get("lclick_fpp") is None or anims.get("idle_fpp") is None:
        print(f"Warning: {type_id} has no lclick_fpp or idle_fpp")

    desc(data)["animations"] = {
        "ctrl_fpp": "controller.animation.lrclick_fpp",
        "rclick_fpp": f"animation.{bbmodel_fpp}.rclick_fpp",
        "lclick_fpp": f"animation.{bbmodel_fpp}.lclick_fpp",
        "idle_fpp": f"animation.{bbmodel_fpp}.idle_fpp",
    }
    scripts(data)["animate"] = [{"ctrl_fpp": "c.is_first_person"}]
    return data

entity_list = []
mobs_list = []
void_rclick_list = []
rclick_list = []
lclick_list = []
lrclick_list = []

def main():
    for bbmodel in entity_list:
        data = setup_entity(bbmodel)
        export(data, bbmodel)

    for bbmodel in mobs_list:
        data = setup_mobs(bbmodel, "controller.animation.default")
        export(data, bbmodel)
        
    for bbmodel in void_rclick_list:
        data = setup_void_rclick(bbmodel, bbmodel, "rclick_fpp")
        export(data, bbmodel)
    
    for bbmodel in rclick_list:
        data = setup_rclick(bbmodel, bbmodel, bbmodel)
        export(data, bbmodel)
    
    for bbmodel in lclick_list:
        data = setup_lclick(bbmodel, bbmodel, bbmodel)
        export(data, bbmodel)

if __name__ == "__main__":

    import resources
    import reference
    resources.main()
    reference.main()
