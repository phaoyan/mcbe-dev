import base64
import os
from pathlib import Path
import json
from typing import Any
from utils import *


def list_bbomdel_files():
    bbpack_dir = BBPACK_DIR
    bbmodel_files = list(bbpack_dir.rglob("*.bbmodel"))
    return bbmodel_files


def setup_basic(bbmodel_file: Path):
    data = json.loads(bbmodel_file.read_text(encoding="utf-8"))
    data["model_identifier"] = bbmodel_file.stem
    data["name"] = bbmodel_file.stem
    model: str = data["model_identifier"]
    textures: list[dict] = data.get("textures", [])
    animations: list[dict] = data.get("animations", [])

    for animation in animations:
        animation["path"] = str(
            (RESOURCE_PACK_DIR / "animations" / f"{model}.animation.json").resolve()
        )
        anim_name: str = animation.get("name", "")
        if not anim_name.startswith("animation."):
            animation["name"] = f"animation.{bbmodel_file.stem}.{anim_name}"
    for idx, texture in enumerate(textures):
        texture["name"] = f"{bbmodel_file.stem}_{idx}"
        texture["path"] = str(
            (RESOURCE_PACK_DIR / "textures" / "entity" / f"{texture['name']}").resolve()
        )
    bbmodel_file.write_text(json.dumps(data, indent=JSON_INDENT))


def setup_bbmodel_json():
    data = {}
    bbpack_dir = BBPACK_DIR
    for bbmodel_file in bbpack_dir.rglob("*.bbmodel"):
        bbmodel = json.loads(bbmodel_file.read_text(encoding="utf-8"))
        animations = bbmodel.get("animations", [])
        effects_list = [
            animation["animators"]["effects"]
            for animation in animations
            if animation.get("animators", {}).get("effects") is not None
        ]
        particles = {}
        for effects in effects_list:
            keyframes = effects.get("keyframes", [])
            for kf in keyframes:
                if kf.get("channel") == "particle":
                    data_points = kf.get("data_points", [])
                    for dp in data_points:
                        name = dp.get("effect")
                        particles[name] = f"{NAME_SPACE}:{name}"
        
        model_identifier = bbmodel.get("model_identifier", bbmodel_file.stem)
        textures = bbmodel.get("textures", [])
        
        data[bbmodel_file.stem] = {
            "geometry": model_identifier,
            "textures": [texture.get("name", f"{bbmodel_file.stem}_{i}") for i, texture in enumerate(textures)],
            "animations": {
                animation.get("name", "").split(".")[-1]: animation.get("name", "")
                for animation in animations
                if animation.get("name")
            },
            "animation_length": {
                animation.get("name", "").split(".")[-1]: animation.get("length", 0)
                for animation in animations
                if animation.get("name")
            },
            "particles": particles,
            "sounds": {},
        }
    bbmodel_json_path = BBPACK_DIR / "bbmodel.json"
    bbmodel_json_path.write_text(json.dumps(data, indent=JSON_INDENT))
    (SCRIPTS_DIR / "json").mkdir(exist_ok=True)
    (SCRIPTS_DIR / "json" / "bbmodel.json").write_text(
        json.dumps(data, indent=JSON_INDENT)
    )


def save_base64_image(base64_str, output_path):
    if base64_str.startswith("data:image"):
        _, base64_data = base64_str.split(",", 1)
    else:
        base64_data = base64_str
    image_data = base64.b64decode(base64_data)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(image_data)
    print(f"图片已保存到: {output_path}")


def export_texture(bbmodel_file: Path):
    output_dir = RESOURCE_PACK_DIR / "textures" / "entity"
    bbmodel = json.loads(bbmodel_file.read_text(encoding="utf-8"))
    textures = bbmodel.get("textures", [])
    for texture in textures:
        image_base64 = texture.get("source")
        texture_name = texture.get("name", f"{bbmodel_file.stem}_texture")
        if image_base64:
            save_base64_image(
                image_base64, f"{output_dir}/{texture_name.replace('.png','')}.png"
            )


def export_geometry(bbmodel_file: Path, ignores: list[str]):
    target_model_path = RESOURCE_PACK_DIR / "models" / "entity" / bbmodel_file.name
    target_model_path.parent.mkdir(parents=True, exist_ok=True)
    bbmodel = json.loads(bbmodel_file.read_text(encoding="utf-8"))
    elements = bbmodel.get("elements", [])
    bbmodel["elements"] = [
        element for element in elements if element.get("name", "") not in ignores
    ]
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
    model_identifier = bbmodel.get("model_identifier", bbmodel_file.stem)
    target_path = (
        RESOURCE_PACK_DIR
        / "animations"
        / f"{model_identifier}.animation.json"
    )
    target_path.parent.mkdir(exist_ok=True)
    animations: list[dict[str, Any]] = bbmodel.get("animations", [])
    output_animations: dict[str, dict[str, Any]] = {}
    for animation in animations:
        if animation.get("animators") is None:
            continue

        name = animation.get("name", "")
        animation_length = animation.get("length", 0)
        override_previous_animation = animation.get("override", False)
        loop_mode = animation.get("loop", "once")
        loop = (
            True
            if loop_mode == "loop"
            else "hold_on_last_frame" if loop_mode == "hold" else False
        )

        bones: dict[str, dict[str, Any]] = {}
        particle_effects: dict[str, Any] = {}
        sound_effects: dict[str, Any] = {}

        animators: dict[str, dict[str, Any]] = animation.get("animators", {})
        for animator in animators.values():
            animator_name: str = animator.get("name", "")
            animator_type: str = animator.get("type", "")
            keyframes: list[dict[str, Any]] = animator.get("keyframes", [])
            if animator_type == "bone":
                bone_data = {}
                for keyframe in keyframes:
                    channel = keyframe.get("channel", "")
                    time = keyframe.get("time", 0)
                    data_points = keyframe.get("data_points", [])
                    interpolation = keyframe.get("interpolation", "linear")
                    if len(data_points) > 0:
                        first_point = data_points[0]
                        data_points = [
                            first_point.get("x", 0),
                            first_point.get("y", 0),
                            first_point.get("z", 0),
                        ]
                        data_points = [
                            float(dp) if is_float(dp) else dp for dp in data_points
                        ]
                        fillin = (
                            data_points
                            if interpolation == "linear"
                            else (
                                {
                                    "pre": data_points,
                                    "post": data_points,
                                    "lerp_mode": "catmullrom",
                                }
                                if interpolation == "catmullrom"
                                else None
                            )
                        )
                        if fillin is not None:
                            bone_data[channel] = bone_data.get(channel, {}) | {
                                str(time): fillin
                            }
                if bone_data:
                    bones[animator_name] = bone_data

            elif animator_type == "effect":
                for keyframe in keyframes:
                    channel = keyframe.get("channel", "")
                    time = keyframe.get("time", 0)
                    if channel == "particle":
                        data_points = [
                            {"effect": dp.get("effect", ""), "locator": dp.get("locator", "")}
                            for dp in keyframe.get("data_points", [])
                            if dp.get("effect")
                        ]
                        if data_points:
                            particle_effects[str(time)] = data_points
                    elif channel == "sound":
                        data_points = [
                            {"effect": dp.get("effect", "")} 
                            for dp in keyframe.get("data_points", [])
                            if dp.get("effect")
                        ]
                        if data_points:
                            sound_effects[str(time)] = data_points

        if name:
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
    target_path.write_text(
        json.dumps(
            {"format_version": "1.8.0", "animations": output_animations},
            indent=JSON_INDENT,
        )
    )


def deploy_bbmodel(bbmodel_file: Path):
    export_texture(bbmodel_file)
    export_geometry(bbmodel_file, ignores=["hitbox"])
    export_animation(bbmodel_file)


def setup_bbmodels():
    bbmodel_files = list_bbomdel_files()
    for bbmodel_file in bbmodel_files:
        setup_basic(bbmodel_file)
        deploy_bbmodel(bbmodel_file)
    setup_bbmodel_json()


if __name__ == "__main__":
    setup_bbmodels()
