from utils import *
import os
import uuid

def setup(project_name: str):
    os.rename(next(iter(RESOURCE_PACK_DIR.iterdir())), RESOURCE_PACK_DIR / project_name)
    os.rename(next(iter(BEHAVIOR_PACK_DIR.iterdir())), BEHAVIOR_PACK_DIR / project_name)
    ENV_PATH.write_text(f'PROJECT_NAME="{project_name}"\nMINECRAFT_PRODUCT="BedrockUWP"\nCUSTOM_DEPLOYMENT_PATH=""')
    resource_uuid = uuid.uuid4()
    behavior_uuid = uuid.uuid4()
    script_uuid = uuid.uuid4()
    resource_manifest_file = RESOURCE_PACK_DIR / project_name / "manifest.json"
    behavior_manifest_file = BEHAVIOR_PACK_DIR / project_name / "manifest.json"
    resource_manifest = json.loads(resource_manifest_file.read_text())
    behavior_manifest = json.loads(behavior_manifest_file.read_text())
    resource_manifest["header"]["name"] = f"{project_name} Resource Pack"
    behavior_manifest["header"]["name"] = f"{project_name} Behavior Pack"
    resource_manifest["header"]["description"] = f"{project_name} Resource Pack"
    behavior_manifest["header"]["description"] = f"{project_name} Behavior Pack"
    resource_manifest["header"]["uuid"] = str(resource_uuid)
    behavior_manifest["header"]["uuid"] = str(behavior_uuid)
    resource_manifest["dependencies"][0]["uuid"] = str(behavior_uuid)
    behavior_manifest["dependencies"][0]["uuid"] = str(resource_uuid)
    behavior_manifest["modules"][0]["uuid"] = str(script_uuid)
    resource_manifest_file.write_text(json.dumps(resource_manifest, indent=JSON_INDENT))
    behavior_manifest_file.write_text(json.dumps(behavior_manifest, indent=JSON_INDENT))
    print(f"Project '{project_name}' setup complete.")
    print("Resource pack UUID:", resource_uuid)
    print("Behavior pack UUID:", behavior_uuid)
    print("Script UUID:", script_uuid)
  
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Setup Minecraft project")
    parser.add_argument("project_name", type=str, help="Name of the project")
    args = parser.parse_args()
    setup(args.project_name)
    print(f"Project '{args.project_name}' setup complete.")