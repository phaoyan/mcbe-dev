import { NAME_SPACE } from "../utils";

export const bpEffect = (typeId: string) => {
    return {
        "format_version": "1.21.10",
        "minecraft:entity": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "is_spawnable": false,
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

export const bpDecoration = (typeId: string) => {
    return {
        "format_version": "1.21.10",
        "minecraft:entity": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "is_spawnable": false,
                "is_summonable": true,
                "is_experimental": false
            },
            "components": {
                "minecraft:collision_box": {
                    "width": 1,
                    "height": 1
                },
                "minecraft:physics": {
                    "has_gravity": true,
                    "has_collision": true,
                },
                "minecraft:health": {
                    "max": 1e4,
                    "value": 1e4
                },
                "minecraft:type_family": {
                    "family": ["decoration", "dummy"]
                },
                "minecraft:damage_sensor": {
                    "triggers": {
                        "deals_damage": false
                    }
                },
                "minecraft:interact": {
                    "interactions": [
                        {
                            "on_interact": {
                                "filters": {
                                    "all_of": [
                                        {
                                            "test": "is_family",
                                            "subject": "other",
                                            "value": "player"
                                        }
                                    ]
                                }
                            }
                        }
                    ]
                }
            }
        }
    };
};