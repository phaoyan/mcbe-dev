import base64
import os
from pathlib import Path
import json
from typing import Any
from utils import *


def list_bbomdel_files():
    bbmodel_files = list(BBMODEL_DIR.glob("*.bbmodel"))
    return bbmodel_files
  
def setup_basic(bbmodel_file: Path):
    data = json.loads(bbmodel_file.read_text(encoding="utf-8"))
    data["model_identifier"] = bbmodel_file.stem
    data["name"] = bbmodel_file.stem
    model: str = data["model_identifier"]
    textures: list[dict] = data["textures"]
    animations: list[dict] = data["animations"]
    
    
    for animation in animations:
        animation["path"] = str((RESOURCE_PACK_DIR / "animations" / f"{model}.animation.json").resolve())
        anim_name: str = animation["name"]
        if not anim_name.startswith("animation."):
            animation["name"] = f"animation.{bbmodel_file.stem}.{anim_name}"
        animators: dict[str, dict] = animation.get("animators", {})
        for animator in animators.values():
            for keyframe in animator["keyframes"]:
                keyframe: dict[str, Any] = keyframe
                if keyframe["channel"].__eq__("particle"):
                    for datapoint in keyframe["data_points"]:
                        particle_file = Path(datapoint["file"])
                        datapoint["file"] = str((RESOURCE_PACK_DIR / "particles" / particle_file.name).resolve())
    for idx, texture in enumerate(textures):
        texture["name"] = f"{bbmodel_file.stem}_{idx}"
        texture["path"] = str((RESOURCE_PACK_DIR / "textures" / "entity" / f"{texture['name']}").resolve())
    bbmodel_file.write_text(json.dumps(data, indent=JSON_INDENT))

def setup_name_mapping():
    data = {}
    for bbmodel_file in BBMODEL_DIR.rglob("*.bbmodel"):
        bbmodel = json.loads(bbmodel_file.read_text(encoding="utf-8"))
        effects_list = [animation["animators"]["effects"] for animation in bbmodel["animations"] if animation.get("animators", {}).get("effects") is not None]
        particles = {}
        for effects in effects_list:
            for kf in effects["keyframes"]:
                if kf["channel"].__eq__("particle"):
                    for dp in kf["data_points"]:
                        name = dp["effect"]
                        file = dp.get("file")
                        if file is None or not Path(file).exists():
                            continue
                        try: 
                            particle_id = json.loads(Path(file).read_text())["particle_effect"]["description"]["identifier"]
                            particles[name] = particle_id
                        except:
                            continue
        data[bbmodel_file.stem] = {
            "geometry": bbmodel["model_identifier"],
            "textures": [texture["name"] for texture in bbmodel["textures"]],
            "animations": {animation["name"].split(".")[-1]: animation["name"] for animation in bbmodel["animations"]},
            "animation_length": {animation["name"].split(".")[-1]: animation["length"] for animation in bbmodel["animations"]},
            "particles": particles,
            "sounds": {}    
        }
    NAME_MAPPING_PATH.write_text(json.dumps(data, indent=JSON_INDENT))
    (SCRIPTS_DIR / "json").mkdir(exist_ok=True)
    (SCRIPTS_DIR / "json" / "name_mapping.json").write_text(json.dumps(data, indent=JSON_INDENT))

def save_base64_image(base64_str, output_path):
    if base64_str.startswith('data:image'):
        _, base64_data = base64_str.split(',', 1)
    else:
        base64_data = base64_str
    image_data = base64.b64decode(base64_data)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(image_data)
    print(f"图片已保存到: {output_path}")

def export_texture(bbmodel_file: Path):
    output_dir = RESOURCE_PACK_DIR / "textures" / "entity"
    bbmodel = json.loads(bbmodel_file.read_text(encoding="utf-8"))
    for texture in bbmodel["textures"]:
        image_base64 = texture["source"]
        save_base64_image(image_base64, f"{output_dir}/{texture['name'].replace('.png','')}.png")


def export_geometry(bbmodel_file: Path, ignores: list[str]):
    target_model_path = RESOURCE_PACK_DIR / "models" / "entity" / bbmodel_file.name
    target_model_path.parent.mkdir(parents=True, exist_ok=True)
    bbmodel = json.loads(bbmodel_file.read_text(encoding="utf-8"))
    bbmodel["elements"] = [element for element in bbmodel["elements"] if not element["name"] in ignores]
    target_model_path.write_text(json.dumps(bbmodel))
    os.system(f"node {RESOURCE_PACK_DIR}/bbmodel-converter.js")
    

def is_float(s):
    try:
        float(s)
        return True
    except ValueError:
        return False

def export_animation(bbmodel_file: Path):
    bbmodel = json.loads(bbmodel_file.read_text(encoding="utf-8"))
    target_path = RESOURCE_PACK_DIR / "animations" / f"{bbmodel['model_identifier']}.animation.json"
    target_path.parent.mkdir(exist_ok=True)
    animations: list[dict[str, Any]] = bbmodel["animations"]
    output_animations: dict[str, dict[str, Any]] = {}
    for animation in animations:
        if animation.get("animators") is None:
            continue
        
        name = animation["name"]
        animation_length = animation["length"]  
        override_previous_animation = animation["override"]
        loop = \
            True if animation["loop"].__eq__("loop") else \
            "hold_on_last_frame" if animation["loop"].__eq__("hold") else \
            False

        bones: dict[str, dict[str, Any]] = {}
        particle_effects: dict[str, Any] = {}
        sound_effects: dict[str, Any] = {}
        
        animators: dict[str, dict[str, Any]] = animation["animators"]
        for animator in animators.values():
            animator_name: str = animator["name"]
            animator_type: str = animator["type"]
            keyframes: list[dict[str, Any]] = animator["keyframes"]
            if animator_type.__eq__("bone"):
                bone_data = {}
                for keyframe in keyframes:
                    channel       = keyframe["channel"]
                    time          = keyframe["time"]
                    data_points   = keyframe["data_points"]
                    interpolation = keyframe["interpolation"]
                    data_points   = [data_points[0]["x"], data_points[0]["y"], data_points[0]["z"]]
                    data_points = [float(dp) if is_float(dp) else dp for dp in data_points]
                    fillin = \
                        data_points if interpolation.__eq__("linear") else \
                        {"pre": data_points, "post": data_points, "lerp_mode": "catmullrom"} if interpolation.__eq__("catmullrom") else \
                        None
                    if fillin is None:
                        continue
                    bone_data[channel] = bone_data.get(channel, {}) | { str(time): fillin }
                bones[animator_name] = bone_data

            elif animator_type.__eq__("effect"):
                for keyframe in keyframes:
                    channel     = keyframe["channel"]
                    time        = keyframe["time"]
                    if channel.__eq__("particle"):
                        data_points = [{ "effect": dp["effect"], "locator": dp["locator"] } for dp in keyframe["data_points"]]
                        particle_effects[str(time)] = data_points
                    elif channel.__eq__("sound"):
                        data_points = [{ "effect": dp["effect"] } for dp in keyframe["data_points"]]
                        sound_effects[str(time)] = data_points
            
        
        output_animations[name] = {
            "animation_length": animation_length,
            "override_previous_animation": override_previous_animation,
            "loop": loop,
        }
        
        if len(bones.keys()) > 0:
            output_animations[name]["bones"] = bones
        if len(particle_effects.keys()) > 0:
            output_animations[name]["particle_effects"] = particle_effects
        if len(sound_effects.keys()) > 0:
            output_animations[name]["sound_effects"] = sound_effects
            
    if len(output_animations.keys()) == 0:
        return
    target_path.write_text(json.dumps({
        "format_version": "1.8.0",
        "animations": output_animations
    }, indent=JSON_INDENT))
    

def deploy_bbmodel(bbmodel_file: Path):
    export_texture(bbmodel_file)
    export_geometry(bbmodel_file, ignores=["hitbox"])
    export_animation(bbmodel_file)
 

def setup_bbmodels():
    bbmodel_files = list_bbomdel_files()
    for bbmodel_file in bbmodel_files:
        setup_basic(bbmodel_file)
        deploy_bbmodel(bbmodel_file)
    setup_name_mapping()

  
if __name__ == "__main__":
    setup_bbmodels()