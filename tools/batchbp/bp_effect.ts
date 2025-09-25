import { NAME_SPACE } from "../utils";

export const bpEffect = (typeId: string) => {
    return {
        "format_version": "1.21.10",
        "minecraft:entity": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "is_spawnable": true,
                "is_summonable": true,
                "is_experimental": false
            },
            "components": {
                "minecraft:collision_box": {
                    "width": 0,
                    "height": 0
                },
                "minecraft:health": {
                    "max": 1e4,
                    "value": 1e4
                },
                "minecraft:type_family": {
                    "family": ["effect", "dummy"]
                },
                "minecraft:damage_sensor": {
                    "triggers": {
                        "deals_damage": false
                    }
                },
                "minecraft:on_target_acquired": {
                    "event": "event:target_acquired",
                    "target": "self"
                },
                "minecraft:on_target_escape": {
                    "event": "event:target_escape",
                    "target": "self"
                },
                "minecraft:timer": {
                    "time": 0.05,
                    "time_down_event": {
                        "event": "event:timer"
                    }
                }
            },
            "component_groups": {},
            "events": {
                "event:target_acquired": {},
                "event:target_escape": {},
                "event:timer": {}
            }
        }
    };
};