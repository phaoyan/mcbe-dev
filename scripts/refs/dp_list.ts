import ref from "./ref";

export const dpId = (id: string)=>{
    return `${ref.name_space}:${id}`;
};

export const dpList = {
    lclick_dummy_idx: "minecraft_dev:lclick_dummy_idx",
    lclick_host: "minecraft_dev:lclick_host",

    voidbind_used: "minecraft_dev:voidbind_used",
    
    player_rcflag: "minecraft_dev:player_rcflag",
    player_snkflag: "minecraft_dev:player_snkflag",
    player_runflag: "minecraft_dev:player_runflag",
    player_input_pattern: "minecraft_dev:player_input_pattern",
    player_operation_map: "minecraft_dev:player_operation_map",
    player_input_lock: "minecraft_dev:player_input_lock",

    player_prev_animbind: "minecraft_dev:player_prev_animbind",
    player_animation_reverse: "minecraft_dev:player_animation_reverse",
    player_animation_slot: "minecraft_dev:player_animation_slot",
    player_prev_itembind: "minecraft_dev:player_prev_itembind",
    player_prev_state: "minecraft_dev:player_prev_state",
    player_is_onground: "minecraft_dev:player_is_onground",
    player_is_jumping: "minecraft_dev:player_is_jumping",
    player_is_running: "minecraft_dev:player_is_running",
    player_is_sneaking: "minecraft_dev:player_is_sneaking",
    player_is_swimming: "minecraft_dev:player_is_swimming",
    player_offhand: "minecraft_dev:player_offhand",
    player_mainhand: "minecraft_dev:player_mainhand",
    player_head: "minecraft_dev:player_head",
    player_chest: "minecraft_dev:player_chest",
    player_legs: "minecraft_dev:player_legs",
    player_feet: "minecraft_dev:player_feet",
    player_selected_slot_idx: "minecraft_dev:player_selected_slot_idx",
    player_camera_reset: "minecraft_dev:player_camera_reset",
    player_skill_cooldowns: "minecraft_dev:player_skill_cooldowns",
    player_skill_locking: "minecraft_dev:player_skill_locking",
    player_combo_stop: "minecraft_dev:player_combo_stop",
    player_combo_cooldown: "minecraft_dev:player_combo_cooldown",
    player_location: "minecraft_dev:player_location",
    player_coin: "minecraft_dev:player_coin",
    player_current_missions: "minecraft_dev:player_current_missions",

    world_dp_timeline: "minecraft_dev:world_dp_timeline",
    world_dp_activate: "minecraft_dev:world_dp_activate",
    world_show_damage: "minecraft_dev:world_show_damage",
    world_disable_block_ticking: "minecraft_dev:world_disable_block_ticking",
    world_entity_death_event: "minecraft_dev:world_entity_death_event",


    mob_spawning: "minecraft_dev:mob_spawning",
    mob_first_spawn: "minecraft_dev:mob_first_spawn",
    mob_skill_cooldowns: "minecraft_dev:mob_skill_cooldowns",
    mob_skill_locking: "minecraft_dev:mob_skill_locking",
    mob_target: "minecraft_dev:mob_target",
    mob_targeted_by: "minecraft_dev:mob_targeted_by",
    mob_dead: "minecraft_dev:mob_dead",
    mob_hurt: "minecraft_dev:mob_hurt",
    mob_hurt_counter: "minecraft_dev:mob_hurt_counter",
    mob_hurt_by: "minecraft_dev:mob_hurt_by",
    mob_blackboard: "minecraft_dev:mob_blackboard", // 行为树blackboard数据
    mob_skill_ignore_filter: "minecraft_dev:mob_skill_ignore_filter",

    npc_initiator: "minecraft_dev:npc_initiator",
    npc_state: "minecraft_dev:npc_state",

    entity_faction: "minecraft_dev:entity_faction", // 实体阵营
    entity_sched_id: "minecraft_dev:entity_sched_id", // 实体调度id, 将其设置为undefined可以中断调度
    damage_attribute: "minecraft_dev:damage_attribute", // 玩家、怪物、装备都可能使用到这条属性


    effect_state: "minecraft_dev:effect_state",
    effect_refresh: "minecraft_dev:effect_refresh",
    effect_superarmor: "minecraft_dev:effect_superarmor",
    effect_dizzy: "minecraft_dev:effect_dizzy",
    effect_move_straight: "minecraft_dev:effect_move_straight",
    effect_disable_movement: "minecraft_dev:effect_disable_movement",
    effect_disable_camera: "minecraft_dev:effect_disable_camera",
    effect_untargetable: "minecraft_dev:effect_untargetable",
    effect_invisible: "minecraft_dev:effect_invisible",
    effect_blind: "minecraft_dev:effect_blind",
    effect_lose_target: "minecraft_dev:effect_lose_target",
    effect_remove: "minecraft_dev:effect_remove",
    effect_die: "minecraft_dev:effect_die",
    effect_damage_absorption: "minecraft_dev:effect_damage_absorption",
    effect_camera_set: "minecraft_dev:effect_camera_set",
    effect_camera_tpp: "minecraft_dev:effect_camera_tpp",
    effect_speed: "minecraft_dev:effect_speed",

    world_npc_generation: "ns_ds:world_npc_generation",
    world_decoration_generation: "ns_ds:world_decoration_generation",
    world_chest_generation: "ns_ds:world_chest_generation",
    world_fight_generation: "ns_ds:world_fight_generation",

    decoration_chest_id: "ns_ds:decoration_chest_id",
    decoration_material_id: "ns_ds:decoration_material_id",
}