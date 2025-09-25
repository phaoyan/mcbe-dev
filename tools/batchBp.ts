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

const setupMob = (params: {
    typeId: string,
    boss?: boolean
})=>{
    const { typeId, boss = false } = params;

    const spawnGroups = [
        "comp:base",
        "comp:common",
        "comp:collision_on",
    ]
    if (boss) {
        spawnGroups.push("comp:boss")
    }

    return {
        "format_version": "1.21.10",
        "minecraft:entity": {
            "description": {
                "identifier": `${NAME_SPACE}:${typeId}`,
                "is_spawnable": true,
                "is_summonable": true,
                "is_experimental": false
            },
            "component_groups": {
                "comp:base": {
                    "minecraft:physics": {},
                    "minecraft:type_family": {
                        "family": [
                            "monster"
                        ]
                    },
                    "minecraft:health": {
                        "value": 100
                    },
                    "minecraft:navigation.walk": {
                        "can_path_over_water": true,
                        "avoid_water": true,
                        "avoid_damage_blocks": true
                    },
                    "minecraft:movement.basic": {},
                    "minecraft:jump.static": {},
                    "minecraft:movement": {
                        "value": 0.2
                    },
                    "minecraft:knockback_resistance": {
                        "value": 0
                    }
                },
                "comp:common": {
                    "minecraft:variant": {
                        "value": 255
                    },
                    "minecraft:timer": {
                        "time": 0.05,
                        "time_down_event": {
                            "event": "event:timer"
                        }
                    },
                    "minecraft:damage_sensor": {
                        "triggers": [
                            {
                                "on_damage": {
                                    "filters": {
                                        "test": "has_damage",
                                        "subject": "self",
                                        "value": "fatal"
                                    },
                                    "event": "event:death"
                                },
                                "deals_damage": false
                            },
                            {
                                "on_damage": {
                                    "filters": {
                                        "test": "has_damage",
                                        "subject": "self",
                                        "value": "fatal",
                                        "operator": "!="
                                    },
                                    "event": "event:hurt"
                                },
                                "deals_damage": true
                            }
                        ]
                    },
                    "minecraft:on_target_acquired": {
                        "event": "event:target_acquired",
                        "target": "self"
                    },
                    "minecraft:on_target_escape": {
                        "event": "event:target_escape",
                        "target": "self"
                    },
                    "minecraft:behavior.nearest_attackable_target": {
                        "priority": 2,
                        "within_radius": 64,
                        "reselect_targets": true,
                        "entity_types": [
                            {
                                "filters": {
                                    "any_of": [
                                        {
                                            "test": "has_tag",
                                            "subject": "other",
                                            "value": "minecraft_dev:targeted_by_nsgl:boss_crimson_eyed"
                                        }
                                    ]
                                },
                                "max_dist": 64
                            }
                        ],
                        "must_see": true,
                        "must_see_forget_duration": 17
                    }
                },
                "comp:idle": {
                    "minecraft:variant": {
                        "value": 0
                    },
                    "minecraft:behavior.random_stroll": {
                        "priority": 6,
                        "speed_multiplier": 0.8
                    },
                    "minecraft:behavior.random_look_around": {
                        "priority": 8
                    }
                },
                "comp:fight": {
                    "minecraft:variant": {
                        "value": 1
                    },
                    "minecraft:attack": {
                        "damage": 0
                    },
                    "minecraft:behavior.ranged_attack": {
                        "priority": 1,
                        "speed_multiplier": 2,
                        "attack_interval_min": 1,
                        "attack_interval_max": 1,
                        "attack_radius": 1
                    }
                },
                "comp:super_armor_on": {
                    "minecraft:knockback_resistance": {
                        "value": 1
                    }
                },
                "comp:super_armor_off": {
                    "minecraft:knockback_resistance": {
                        "value": 0
                    }
                },
                "comp:collision_on": {
                    "minecraft:collision_box": {
                        "height": 6,
                        "width": 4
                    }
                },
                "comp:collision_off": {
                    "minecraft:collision_box": {
                        "height": 0,
                        "width": 0
                    }
                },
                "comp:boss": {
                    "minecraft:boss": {
                        "hud_range": 55,
                        "name": typeId,
                        "should_darken_sky": false
                    }
                },
            },
            "events": {
                "minecraft:entity_spawned": {
                    "add": {
                        "component_groups": spawnGroups
                    }
                },
                "event:timer": {},
                "event:target_acquired": {},
                "event:target_escape": {},
                "event:hurt": {},
                "event:death": {
                    "remove": {
                        "component_groups": [
                            "comp:idle",
                            "comp:fight"
                        ]
                    }
                },
                "event:idle": {
                    "add": {
                        "component_groups": [
                            "comp:idle"
                        ]
                    },
                    "remove": {
                        "component_groups": [
                            "comp:fight"
                        ]
                    }
                },
                "event:fight": {
                    "add": {
                        "component_groups": [
                            "comp:fight"
                        ]
                    },
                    "remove": {
                        "component_groups": [
                            "comp:idle"
                        ]
                    }
                },
                "event:super_armor_on": {
                    "remove": {
                        "component_groups": [
                            "comp:super_armor_off"
                        ]
                    },
                    "add": {
                        "component_groups": [
                            "comp:super_armor_on"
                        ]
                    }
                },
                "event:super_armor_off": {
                    "remove": {
                        "component_groups": [
                            "comp:super_armor_on"
                        ]
                    },
                    "add": {
                        "component_groups": [
                            "comp:super_armor_off"
                        ]
                    }
                },
                "event:untargetable_on": {
                    "remove": {
                        "component_groups": [
                            "comp:collision_on"
                        ]
                    },
                    "add": {
                        "component_groups": [
                            "comp:collision_off"
                        ]
                    }
                },
                "event:untargetable_off": {
                    "remove": {
                        "component_groups": [
                            "comp:collision_off"
                        ]
                    },
                    "add": {
                        "component_groups": [
                            "comp:collision_on"
                        ]
                    }
                }
            }
        }
    }
}

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