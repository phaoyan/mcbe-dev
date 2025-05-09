from utils import *

def generate_item_texture_list():
    data = json.loads((SCRIPTS_DIR / "json" / "item_ids.json").read_text())
    names = [f"{k}.item.json" for k in data.keys()]
    target = PYTHON_DIR / "outputs" / "item_texture_list.txt"
    target.write_text("\n".join(names))

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

    item_texture_path.write_text(json.dumps(item_texture_json, indent=JSON_INDENT))

def deploy_item_texture():
    item_dir = BEHAVIOR_PACK_DIR / "items"
    for item_file in item_dir.rglob("*.json"):
        data = json.loads(item_file.read_text())
        data["minecraft:item"]["components"]["minecraft:icon"] = item_file.stem.replace(".item","")
        item_file.write_text(json.dumps(data, indent=JSON_INDENT))
    
def setup_sounds_definition():
    sounds_dir = RESOURCE_PACK_DIR / "sounds"
    def_path   = sounds_dir / "sound_definitions.json"
    def_json = json.loads(def_path.read_text())
    for sound_file in sounds_dir.rglob("*.ogg"):
        sound_path = f"sounds/{str(sound_file.resolve()).replace(str(sounds_dir.resolve()), '').replace('\\','/')}"
        sound_id   = str(sound_file.resolve()).replace(str(sounds_dir.resolve()), "").replace("/",".").replace("\\","")
        def_json["sound_definitions"][sound_id] = {"category": "player","sounds": [{"name": sound_path,"volume": 1.0}]}
    def_path.write_text(json.dumps(def_json, indent=JSON_INDENT))

def setup_sound_type_json():
    sounds_dir  = RESOURCE_PACK_DIR / "sounds"
    def_path    = sounds_dir / "sound_definitions.json"
    target_path = (SCRIPTS_DIR / "json" / "sounds.json")
    prompt_json = {}
    def_json = json.loads(def_path.read_text())
    for key in def_json["sound_definitions"].keys():
        prompt_json[key.replace(".","_")] = key
    target_path.parent.mkdir(exist_ok=True)
    target_path.write_text(json.dumps(prompt_json, indent=JSON_INDENT))

if __name__ == "__main__":
    generate_item_texture_list()
    setup_item_texture_json()
    deploy_item_texture()
    setup_sounds_definition()
    setup_sound_type_json()