import * as path from 'path';
import {
    NAME_SPACE,
    BEHAVIOR_PACK_DIR,
    writeJson,
    ensureDir
} from './utils';

// 导出数据函数
const exportData = (data: any, name: string): void => {
    const type = data["minecraft:entity"] ? "se" : "item";
    const filename = `${name}.${type}.json`;

    const targetPath = type === "se"
        ? path.join(BEHAVIOR_PACK_DIR, "entities", filename)
        : path.join(BEHAVIOR_PACK_DIR, "items", filename);

    ensureDir(path.dirname(targetPath));
    writeJson(targetPath, data);
};

const setupEffect = (typeId: string) => {
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
                    "family": ["effect"]
                },
                "minecraft:damage_sensor": {
                    "triggers": {
                        "on_damage": {
                            "filters": {
                                "test": "has_damage",
                                "subject": "self",
                                "value": "all"
                            }
                        },
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

const setupNpc = (typeId: string)=>{
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
            }
        }
    }
}

const setupItem = (typeId: string, stackSize: number = 64)=>{
    return {
        "format_version": "1.21.10",
        "minecraft:item": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "menu_category": {
                    "category": "items"
                }
            },
            "components": {
                "minecraft:icon": `${typeId}`,
                "minecraft:max_stack_size": stackSize
            }
        }
    }
}

const setupEntityPlacer = (typeId: string, entityId: string)=>{
    return {
        "format_version": "1.21.10",
        "minecraft:item": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "menu_category": {
                    "category": "items"
                }
            },
            "components": {
                "minecraft:icon": `${typeId}`,
                "minecraft:max_stack_size": 1,
                "minecraft:entity_placer": {
                    "entity": entityId.includes(":") ? entityId : `${NAME_SPACE}:${entityId}`
                }
            }
        }
    }
}

const setupRclick = (typeId: string, cd: number) => {
    return {
        "format_version": "1.21.10",
        "minecraft:item": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`
            },
            "components": {
                "minecraft:icon": `${NAME_SPACE}:${typeId}`,
                "minecraft:food": {
                    "can_always_eat": true,
                    "nutrition": 0,
                    "saturation_modifier": 0.0
                },
                "minecraft:cooldown": {
                    "category": `${NAME_SPACE}:${typeId}`,
                    "duration": cd
                },
                "minecraft:use_modifiers": {
                    "use_duration": 9999999,
                    "movement_modifier": 1
                },
                "minecraft:can_destroy_in_creative": false
            }
        }
    };
};

const setupArmor = (typeId: string, slot: string)=>{
    return {
        "format_version": "1.21.10",
        "minecraft:item": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "menu_category": {
                    "category": "items"
                }
            },
            "components": {
                "minecraft:wearable": {
                    "slot": `slot.armor.${slot}`
                },
                "minecraft:icon": `${typeId}`,
                "minecraft:max_stack_size": 1
            }
        }
    }
}

/**
 * 主函数
 */
export async function main(): Promise<void> {
    const comboData = setupRclick("combo", 0);
    exportData(comboData, "rclicks/combo");
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}