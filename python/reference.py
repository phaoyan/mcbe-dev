from utils import *


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

if __name__ == "__main__":
    item_id_refs()
    entity_id_refs()