from utils import *

IGNORE_LIST = []

def init_se(type_id: str) -> dict:
    data = {}
    data["format_version"] = "1.21.10"
    data["minecraft:entity"] = {}
    data["minecraft:entity"]["description"] = {}
    data["minecraft:entity"]["description"]["identifier"] = f"{NAME_SPACE}:{type_id}"
    data["minecraft:entity"]["description"]["is_spawnable"] = True
    data["minecraft:entity"]["description"]["is_summonable"] = True
    data["minecraft:entity"]["description"]["is_experimental"] = False
    data["minecraft:entity"]["components"] = {}
    data["minecraft:entity"]["component_groups"] = {}
    data["minecraft:entity"]["events"] = {}
    return data

def init_item(type_id: str) -> dict:
    data = {}
    data["format_version"] = "1.21.10"
    data["minecraft:item"] = {}
    data["minecraft:item"]["description"] = {}
    data["minecraft:item"]["description"]["identifier"] = f"{NAME_SPACE}:{type_id}"
    data["minecraft:item"]["components"] = {}
    data["minecraft:item"]["components"]["minecraft:icon"] = f"{NAME_SPACE}:{type_id}"
    return data

def json_type(data: dict) -> str:
    return "se" if data.get("minecraft:entity") is not None else "item"

def type_id(data: dict) -> str:
    if json_type(data) == "se":
        return data["minecraft:entity"]["description"]["identifier"]
    else:
        return data["minecraft:item"]["description"]["identifier"]

def components(data: dict) -> dict:
    if json_type(data) == "se":
        return data["minecraft:entity"]["components"]
    else:
        return data["minecraft:item"]["components"]

def component_groups(data: dict) -> dict:
    return data["minecraft:entity"]["component_groups"]

def events(data: dict) -> dict:
    return data["minecraft:entity"]["events"]

# se
def comp_collision_box(data: dict, width: float, height: float):
    components(data)["minecraft:collision_box"] = { "width": width, "height": height }

def comp_health(data: dict, max: int, value: int):
    components(data)["minecraft:health"] = { "max": max, "value": value }

def comp_type_family(data: dict, family: list[str]):
    components(data)["minecraft:type_family"] = { "family": family }

def comp_damage_sensor_undeath(data: dict):
    components(data)["minecraft:damage_sensor"] = {
        "triggers": {
            "on_damage": {
                        "filters": {
                            "test": "has_damage",
                            "subject": "self",
                            "value": "fatal"
                        }
                    },
            "deals_damage": False
        }
    }

# items
def comp_rclick(data: dict, cd: float):
    components(data)["minecraft:food"] = {
        "can_always_eat": True,
        "nutrition": 0,
        "saturation_modifier": 0.0
    }
    components(data)["minecraft:cooldown"] = {
            "category": type_id(data),
            "duration": cd
    }
    components(data)["minecraft:use_modifiers"] = {
        "use_duration": 9999999,
        "movement_modifier": 1
    }
    components(data)["minecraft:can_destroy_in_creative"] = False
    
def export(data, name: str):
    type = json_type(data)
    filename = f"{name}.{type}.json"
    if filename in IGNORE_LIST:
        return
    target_path = BEHAVIOR_PACK_DIR / "entities" / filename if type == "se" else BEHAVIOR_PACK_DIR / "items" / filename
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(data, indent=JSON_INDENT))

def setup_effect(type_id: str):
    data = init_se(type_id)
    comp_collision_box(data, 0, 0)
    comp_health(data, 1, 1)
    comp_type_family(data, ["effect"])
    comp_damage_sensor_undeath(data)
    return data

def setup_rclick(type_id: str, cd: float):
    data = init_item(type_id)
    comp_rclick(data, cd)
    return data

effect_list = []
rclick_list = ["combo"]

def main():
    for bbmodel in effect_list:
        data = setup_effect(bbmodel)
        export(data, f"effects/{bbmodel}")

    for bbmodel in rclick_list:
        data = setup_rclick(bbmodel, 0)
        export(data, f"rclicks/{bbmodel}")
    
    import resources
    import reference
    resources.main()
    reference.main()

if __name__ == "__main__":
    main()


