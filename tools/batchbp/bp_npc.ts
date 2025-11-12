import { NAME_SPACE } from "../utils"

export const bpNpc = (typeId: string) => {
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
                "minecraft:health": {
                    "value": 100,
                    "max": 100
                },
                "minecraft:movement": {
                    "value": 0,
                    "max": 0
                },
                "minecraft:physics": {},
                "minecraft:damage_sensor": {
                    "triggers": {
                        "cause": "all",
                        "deals_damage": false
                    }
                },
                "minecraft:npc": {},
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
            },
            "events": {
                "minecraft:entity_spawned": {
                    "queue_command": {
                        "command": [
                            "scriptevent ns_gl:dialogue_change"
                        ]
                    }
                }
            }
        }
    }
}