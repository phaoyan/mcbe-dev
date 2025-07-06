from utils import *
#!/usr/bin/env python3
import yaml
import json
import os

def item_id_refs():
    item_ids = {}
    for item_file in Path(BEHAVIOR_PACK_DIR).rglob("*.item.json"):
        item_data = json.loads(item_file.read_text())
        item_id = item_data["minecraft:item"]["description"]["identifier"]
        item_ids[item_id.split(":")[-1]] = item_id
    (SCRIPTS_DIR / "json" / "item_ids.json").write_text(json.dumps(item_ids, indent=JSON_INDENT))


def entity_id_refs():
    entity_ids = {}
    for entity_file in Path(BEHAVIOR_PACK_DIR).rglob("*.se.json"):
        entity_data = json.loads(entity_file.read_text())
        entity_id = entity_data["minecraft:entity"]["description"]["identifier"]
        entity_ids[entity_id.split(":")[-1]] = entity_id
    (SCRIPTS_DIR / "json" / "entity_ids.json").write_text(json.dumps(entity_ids, indent=JSON_INDENT))

def animation_id_refs():
    animation_ids = {}
    for animation_file in RESOURCE_PACK_DIR.rglob("*.animation.json"):
        animation_data = json.loads(animation_file.read_text())
        animation_ids |= {animation.replace("animation.", "").replace(".","_"):animation for animation in animation_data["animations"].keys()}
    (SCRIPTS_DIR / "json" / "particle_ids.json").write_text(json.dumps(animation_ids, indent=JSON_INDENT))

def particle_id_refs():
    particle_ids = {}
    for particle_file in RESOURCE_PACK_DIR.rglob("*.particle.json"):
        particle_data = json.loads(particle_file.read_text())
        particle_id = particle_data["particle_effect"]["description"]["identifier"]
        particle_ids[particle_id.split(":")[-1]] = particle_id
    (SCRIPTS_DIR / "json" / "particle_ids.json").write_text(json.dumps(particle_ids, indent=JSON_INDENT))

def sound_id_refs():
    sound_ids = {}
    for sound_def in RESOURCE_PACK_DIR.rglob("sound_definitions.json"):
        sound_data = json.loads(sound_def.read_text())
        for sound_id in sound_data["sound_definitions"].keys():
            sound_ids[sound_id.replace(".","_")] = sound_id
    (SCRIPTS_DIR / "json" / "sound_ids.json").write_text(json.dumps(sound_ids, indent=JSON_INDENT))

def main():
    item_id_refs()
    entity_id_refs()
    animation_id_refs()
    particle_id_refs()
    sound_id_refs()

if __name__ == "__main__":
    main()