import json
from pathlib import Path

def get_project_name():
    project_name = ENV_PATH.read_text().splitlines()[0].split("=")[1].strip('"')
    return project_name

ENV_PATH = Path(__file__).parent.parent / ".env"
PROJECT_NAME = get_project_name()
RESOURCE_PACK_DIR = Path(__file__).parent.parent / "resource_packs" / PROJECT_NAME
BEHAVIOR_PACK_DIR = Path(__file__).parent.parent / "behavior_packs" / PROJECT_NAME
SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"

def setup_item_texture_json():
    item_dir = BEHAVIOR_PACK_DIR / "items"
    item_texture_path = RESOURCE_PACK_DIR / "textures" / "item_texture.json"
    item_textures_dir = RESOURCE_PACK_DIR / "textures" / "items"
    item_texture_json = json.loads((item_texture_path).read_text())
    item_texture_names = set([file.stem for file in item_textures_dir.rglob("*.png")])
    for item_file in item_dir.rglob("*.json"):
        item_id = item_file.stem.replace(".item","")
        if item_id in item_texture_names:
            item_texture_json["texture_data"][item_id] = {"textures": f"textures/items/{item_id}"}
        else:
            item_texture_json["texture_data"][item_id] = {"textures": f"textures/items/book"}

    item_texture_path.write_text(json.dumps(item_texture_json, indent=4))

def deploy_item_texture():
    item_dir = BEHAVIOR_PACK_DIR / "items"
    for item_file in item_dir.rglob("*.json"):
        data = json.loads(item_file.read_text())
        data["minecraft:item"]["components"]["minecraft:icon"] = item_file.stem.replace(".item","")
        item_file.write_text(json.dumps(data, indent=4))
    
def setup_sounds_definition():
    sounds_dir = RESOURCE_PACK_DIR / "sounds"
    def_path   = sounds_dir / "sound_definitions.json"
    def_json = json.loads(def_path.read_text())
    for sound_file in sounds_dir.rglob("*.ogg"):
        sound_path = f"sounds/{str(sound_file.resolve()).replace(str(sounds_dir.resolve()), '').replace('\\','/')}"
        sound_id   = str(sound_file.resolve()).replace(str(sounds_dir.resolve()), "").replace("/",".").replace("\\","")
        def_json["sound_definitions"][sound_id] = {"category": "player","sounds": [{"name": sound_path,"volume": 1.0}]}
    def_path.write_text(json.dumps(def_json, indent=4))

def setup_sound_type_json():
    sounds_dir  = RESOURCE_PACK_DIR / "sounds"
    def_path    = sounds_dir / "sound_definitions.json"
    target_path = (SCRIPTS_DIR / "json" / "sounds.json")
    prompt_json = {}
    def_json = json.loads(def_path.read_text())
    for key in def_json["sound_definitions"].keys():
        prompt_json[key.replace(".","_")] = key
    target_path.parent.mkdir(exist_ok=True)
    target_path.write_text(json.dumps(prompt_json, indent=4))

if __name__ == "__main__":
    setup_item_texture_json()
    deploy_item_texture()
    setup_sounds_definition()
    setup_sound_type_json()