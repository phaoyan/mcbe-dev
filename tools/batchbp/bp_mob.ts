import { BBMODEL_JSON, NAME_SPACE } from "../utils"

export interface MobParams {
    typeId: string
    health?: number
    collisionBox?: number[]
    movement?: number
    movementFightMultiplier?: number
    boss?: boolean
    targetDist?: number
    fallDamageImmune?: boolean
    properties?: Record<string, any>
}

export const bpMob = (params: MobParams) => {
    const {
        typeId,
        boss = false,
        collisionBox = [4, 6],
        health = 100,
        movement = 0.2,
        movementFightMultiplier = 2,
        targetDist = 64,
        fallDamageImmune = false,
        properties = undefined
    } = params;

    const spawnGroups = [
        "comp:base",
        "comp:common",
        "comp:collision_on",
        "comp:targeting",
        "comp:super_armor_off"
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
                "is_experimental": false,
                ...(properties ? { properties: properties } : {})
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
                        "value": health
                    },
                    "minecraft:navigation.walk": {
                        "can_path_over_water": true,
                        "avoid_water": true,
                        "avoid_damage_blocks": true
                    },
                    "minecraft:movement.basic": {},
                    "minecraft:jump.static": {},
                    "minecraft:movement": {
                        "value": movement
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
                            },
                            ...(fallDamageImmune ? [{
                                "cause": "fall",
                                "deals_damage": false
                            }] : [])
                        ]
                    },
                    "minecraft:on_target_acquired": {
                        "event": "event:target_acquired",
                        "target": "self"
                    },
                    "minecraft:on_target_escape": {
                        "event": "event:target_escape",
                        "target": "self"
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
                        "speed_multiplier": movementFightMultiplier,
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
                        "height": collisionBox[1],
                        "width": collisionBox[0]
                    }
                },
                "comp:collision_off": {
                    "minecraft:collision_box": {
                        "height": 0,
                        "width": 0
                    }
                },
                "comp:targeting": {
                    "minecraft:behavior.nearest_attackable_target": {
                        "priority": 2,
                        "within_radius": targetDist,
                        "reselect_targets": true,
                        "entity_types": [
                            {
                                "filters": {
                                    "any_of": [
                                        {
                                            "test": "has_tag",
                                            "subject": "other",
                                            "value": `minecraft_dev:targeted_by_${NAME_SPACE}:${typeId}`
                                        }
                                    ]
                                },
                                "max_dist": targetDist
                            }
                        ],
                        "must_see": true,
                        "must_see_forget_duration": 17
                    }
                },
                "comp:blind": {
                    "minecraft:behavior.random_stroll": {
                        "priority": 1,
                        "speed_multiplier": 0.8
                    },
                    "minecraft:behavior.random_look_around": {
                        "priority": 2
                    }
                },
                "comp:boss": {
                    "minecraft:boss": {
                        "hud_range": 55,
                        "name": `${NAME_SPACE}:${typeId}`,
                        "should_darken_sky": false
                    }
                },
                "comp:invisiable_on": {
                    "minecraft:scale": {
                        "value": 0
                    }
                },
                "comp:invisiable_off": {
                    "minecraft:scale": {
                        "value": 1
                    }
                }
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
                },
                "event:blind_on": {
                    "remove": {
                        "component_groups": [
                            "comp:targeting",
                            "comp:fight"
                        ]
                    },
                    "add": {
                        "component_groups": [
                            "comp:blind"
                        ]
                    }
                },
                "event:blind_off": {
                    "remove": {
                        "component_groups": [
                            "comp:blind"
                        ]
                    },
                    "add": {
                        "component_groups": [
                            "comp:targeting",
                            "comp:fight"
                        ]
                    }
                },
                "event:lose_target_on": {
                    "remove": {
                        "component_groups": [
                            "comp:targeting",
                            "comp:fight"
                        ]
                    }
                },
                "event:lose_target_off": {
                    "add": {
                        "component_groups": [
                            "comp:targeting",
                            "comp:fight"
                        ]
                    }
                },
                "event:invisiable_on": {
                    "remove": {
                        "component_groups": [
                            "comp:invisiable_off"
                        ]
                    },
                    "add": {
                        "component_groups": [
                            "comp:invisiable_on"
                        ]
                    }
                },
                "event:invisiable_off": {
                    "remove": {
                        "component_groups": [
                            "comp:invisiable_on"
                        ]
                    },
                    "add": {
                        "component_groups": [
                            "comp:invisiable_off"
                        ]
                    }
                }
            }
        }
    }
}

export const bpMobWithSkin = (bbmodel: string, params: MobParams) => {
    const bbmodelConfig = BBMODEL_JSON[bbmodel] || {};
    const textures = bbmodelConfig.textures || [];
    const mob: any = bpMob(params);
    mob["minecraft:entity"].description["properties"] = {
        ...(mob["minecraft:entity"].description["properties"] ?? {}),
        [`minecraft_dev:skin`]: {
            "type": "int",
            "range": [ 0, 255 ],
            "default": `math.random_integer(0, ${textures.length-1})`,
            "client_sync": true
        }
    }
    return mob;
}