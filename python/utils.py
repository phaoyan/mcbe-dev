from pathlib import Path
import json

def get_project_name():
    project_name = (Path(__file__).parent.parent / ".env").read_text().splitlines()[0].split("=")[1].strip('"')
    return project_name

PROJECT_NAME = get_project_name()
PYTHON_DIR = Path(__file__).parent
BBMODEL_DIR = Path(__file__).parent / "bbmodel"
TEMPLATES_DIR = Path(__file__).parent / "templates"
NAME_MAPPING_PATH = BBMODEL_DIR / "name_mapping.json"
ENTITY_EXPORT_DIR = Path(__file__).parent / "entity"
ENV_PATH = Path(__file__).parent.parent / ".env"
RESOURCE_PACK_DIR = Path(__file__).parent.parent / "resource_packs" / PROJECT_NAME
BEHAVIOR_PACK_DIR = Path(__file__).parent.parent / "behavior_packs" / PROJECT_NAME
SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"

JSON_INDENT= 4 
NAME_SPACE = ENV_PATH.read_text().splitlines()[0].split("=")[1].strip('"')