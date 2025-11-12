import BB from "./json/bbmodel.json";

export const bosses = [
    BB.boss_alex_voss_boss.id,
    BB.boss_crimson_crow_reaper.id,
    BB.boss_crimson_eyed.id,
    BB.boss_crimson_one_eyed_owl.id,
    BB.boss_grim_reaper.id,
    BB.boss_one_eyed_blood_king.id,
    BB.boss_one_eyed_martial_king.id,
    BB.boss_one_eyed_crimson_king.id,
    BB.boss_blinded_deceiver.id,
    BB.boss_void_darkness_king.id,
]

export const miniBosses = [
    BB.mini_boss_gecko.id,
    BB.mini_boss_haru.id,
    BB.mini_boss_investigator_jack.id,
    BB.mini_boss_investigator_mark.id,
    BB.mini_boss_lira.id,
    BB.mini_boss_lunaris.id,
    BB.mini_boss_masa.id,
    BB.mini_boss_rabbit.id,
    BB.mini_boss_rook.id,
    BB.mini_boss_vale.id,
    BB.mini_boss_steellion.id,
]

export const mobs = [
    BB.mob_angry_ghoul.id,
    BB.mob_brute_ghoul.id,
    BB.mob_combat_investigator.id,
    BB.mob_feral_ghoul.id,
    BB.mob_first_class_investigator.id,
    BB.mob_hungry_ghoul.id,
    BB.mob_investigator_leader.id,
    BB.mob_lurking_ghoul.id,
    BB.mob_nightmare_ghoul.id,
    BB.mob_patrol_leader_female.id,
    BB.mob_patrol_leader_male.id,
    BB.mob_regular_investigator_female.id,
    BB.mob_regular_investigator_male.id,
    BB.mob_tactical_agent.id,
]

export const effects = [
    BB.effect_boss_alex_voss_boss_skill_model_1.id,
    BB.effect_boss_crimson_crow_reaper_monster.id,
    BB.effect_boss_crimson_crow_reaper_thorns.id,
    BB.effect_boss_crimson_eyed_purple_centipede.id,
    // BB.effect_boss_one_eyed_martial_king_skill_model.id,
    BB.effect_boss_one_eyed_martial_king_void_ignition.id,
    BB.effect_boss_void_darkness_darkness_dash.id,
    BB.effect_bite_hit.id,
    BB.effect_scratch_hit.id,
    BB.effect_boss_blind_deceiver_bandage.id,
    BB.effect_kagune_b_deadly_rose.id,
    BB.effect_fire_wall.id,
    BB.effect_bloody_skull_reaper.id,
    BB.effect_blazing_lava_feather.id,
    BB.effect_violet_blood_wing.id,
    BB.effect_crimson_chained_feather.id,
    BB.effect_nature_scythe_wing.id,
    BB.effect_sky_blue_killer.id,
    BB.effect_maroon_eyed_flesh_eater.id,
    BB.effect_toxic_feather.id,
    BB.effect_coral_spine_slasher.id,
    BB.effect_blood_eyed_scythe.id,
    BB.effect_cursed_branch_tail.id,
    BB.effect_wiggly_vine_sword.id,
]

export const npcs = [
    BB.npc_alex.id,
    BB.npc_fita.id,
    BB.npc_fita_ghoul.id,
    BB.npc_gane.id,
    BB.npc_kurona.id,
    BB.npc_shirona.id,
    BB.npc_smith.id,
    BB.npc_smith_ghoul.id,
    BB.npc_unnamed_follower_ghoul_male.id,
    BB.npc_unnamed_follower_ghoul_female.id,
    BB.npc_yagami.id,
]

export const idleAnimationAtt = (idx: number)=>{
    return `animation.ns_gl.animation_kagune_combo${idx}_tpp.idle_att`
}

export const idleAnimationTpp = (idx: number)=>{
    return `animation.ns_gl.animation_kagune_combo${idx}_tpp.idle_tpp`
}

export const idleAnimationFpp = (idx: number)=>{
    return `animation.ns_gl.animation_kagune_combo${idx}_fpp.idle_fpp`
}

export const comboAnimationAtts = (idx: number)=>{
    return [
        `animation.ns_gl.animation_kagune_combo${idx}_tpp.m1_1_att`,
        `animation.ns_gl.animation_kagune_combo${idx}_tpp.m1_2_att`,
        `animation.ns_gl.animation_kagune_combo${idx}_tpp.m1_3_att`,
    ]
}

export const comboAnimationTpps = (idx: number)=>{
    return [
        `animation.ns_gl.animation_kagune_combo${idx}_tpp.m1_1`,
        `animation.ns_gl.animation_kagune_combo${idx}_tpp.m1_2`,
        `animation.ns_gl.animation_kagune_combo${idx}_tpp.m1_3`,
    ]
}

export const comboAnimationFpps = (idx: number)=>{
    return [
        `animation.ns_gl.animation_kagune_combo${idx}_fpp.m1_1`,
        `animation.ns_gl.animation_kagune_combo${idx}_fpp.m1_2`,
        `animation.ns_gl.animation_kagune_combo${idx}_fpp.m1_3`,
    ]
}

export const kaguneCombos: { [key: string]: number } = {}

export const bikaku1 = [
    BB.kagune_bikaku_crimson_stinger.id,
    BB.kagune_bikaku_crimson_tailblade.id,
    BB.kagune_bikaku_cursed_branch_tail.id,
    BB.kagune_bikaku_crimson_gold_stinger.id,
    BB.kakuja_bone_reaper.id,
    BB.kakuja_blazing_magma_tail.id,
]

kaguneCombos.kagune_bikaku_crimson_stinger = 6
kaguneCombos.kagune_bikaku_crimson_tailblade = 6
kaguneCombos.kagune_bikaku_cursed_branch_tail = 6
kaguneCombos.kagune_bikaku_crimson_gold_stinger = 6
kaguneCombos.kakuja_bone_reaper = 6
kaguneCombos.kakuja_blazing_magma_tail = 6

export const bikaku2 = [
    BB.kagune_bikaku_toxic_tailblade.id,
    BB.kagune_bikaku_ember_lava_tail.id,
    BB.kagune_bikaku_frozen_spine.id,
    BB.kagune_bikaku_rosy_tail.id,
    BB.kagune_bikaku_corrupted_spine.id,
    BB.kakuja_crimson_crow.id,
]

kaguneCombos.kagune_bikaku_toxic_tailblade = 6
kaguneCombos.kagune_bikaku_ember_lava_tail = 6
kaguneCombos.kagune_bikaku_frozen_spine = 6
kaguneCombos.kagune_bikaku_rosy_tail = 6
kaguneCombos.kagune_bikaku_corrupted_spine = 6
kaguneCombos.kakuja_crimson_crow = 6


export const bikaku3 = [
    BB.kagune_bikaku_cursed_saw_spine.id,
    BB.kagune_bikaku_violet_tailblade.id,
    BB.kagune_bikaku_deadly_shrooms.id,
    BB.kakuja_toxic_cursed_vine.id,
    BB.kagune_bikaku_bone_crusher.id,
    BB.kakuja_crimson_bone_reaper_a.id,
    BB.kagune_bikaku_sanguine_tailblade.id,
]

kaguneCombos.kagune_bikaku_cursed_saw_spine = 6
kaguneCombos.kagune_bikaku_violet_tailblade = 6
kaguneCombos.kagune_bikaku_deadly_shrooms = 6
kaguneCombos.kakuja_toxic_cursed_vine = 6
kaguneCombos.kagune_bikaku_bone_crusher = 6
kaguneCombos.kakuja_crimson_bone_reaper_a = 6
kaguneCombos.kagune_bikaku_sanguine_tailblade = 6

export const bikaku4 = [
    BB.kagune_bikaku_bloody_flesh_eater.id,
    BB.kagune_bikaku_reinforced_anchor_blade.id,
    BB.kagune_bikaku_cursed_crimson_tailblade.id,
    BB.kakuja_blazing_tailblade_reaper.id,
    BB.kagune_bikaku_crusher_tail.id,
    BB.kagune_bikaku_void_flesh_eater.id,
]

kaguneCombos.kagune_bikaku_bloody_flesh_eater = 6
kaguneCombos.kagune_bikaku_reinforced_anchor_blade = 6
kaguneCombos.kagune_bikaku_cursed_crimson_tailblade = 6
kaguneCombos.kakuja_blazing_tailblade_reaper = 6
kaguneCombos.kagune_bikaku_crusher_tail = 6
kaguneCombos.kagune_bikaku_void_flesh_eater = 6

export const bikaku5 = [
    BB.kagune_bikaku_dead_coral_pike.id,
    BB.kagune_bikaku_viper_whip.id,
    BB.kagune_bikaku_razor_pike.id,
    BB.kagune_bikaku_anchor_tailblade.id,
    BB.kakuja_blood_eyed_reaper.id,
    BB.kagune_bikaku_reinforced_stinger.id,
    BB.kagune_bikaku_deadly_rose.id,
]

kaguneCombos.kagune_bikaku_viper_whip = 6
kaguneCombos.kagune_bikaku_dead_coral_pike = 7
kaguneCombos.kagune_bikaku_anchor_tailblade = 7
kaguneCombos.kagune_bikaku_razor_pike = 9
kaguneCombos.kagune_bikaku_reinforced_stinger = 8
kaguneCombos.kagune_bikaku_deadly_rose = 6
kaguneCombos.kakuja_blood_eyed_reaper = 5

export const koukaku1 = [
    BB.kagune_koukaku_violaceus_gauntlet.id,
    BB.kagune_koukaku_spine_slasher_gauntlet.id,
    BB.kagune_koukaku_petal_gauntlet.id,
    BB.kagune_koukaku_string_slasher.id,
    BB.kagune_koukaku_crimson_eyed_gauntlet.id,
    BB.kagune_koukaku_crimson_slasher_gauntlet.id,
    BB.kagune_koukaku_crimson_violet_gauntlet.id,
]

kaguneCombos.kagune_koukaku_violaceus_gauntlet = 3
kaguneCombos.kagune_koukaku_spine_slasher_gauntlet = 3
kaguneCombos.kagune_koukaku_petal_gauntlet = 3
kaguneCombos.kagune_koukaku_string_slasher = 3
kaguneCombos.kagune_koukaku_crimson_eyed_gauntlet = 3
kaguneCombos.kagune_koukaku_crimson_slasher_gauntlet = 3
kaguneCombos.kagune_koukaku_crimson_violet_gauntlet = 3

export const koukaku2 = [
    BB.kagune_koukaku_blazing_slash_gauntlet.id,
    BB.kagune_koukaku_glacier_gauntlet.id,
    BB.kagune_koukaku_toxic_slisher.id,
    BB.kagune_koukaku_shroom_ward.id,
    BB.kakuja_golden_reaper_suit.id,
    BB.kagune_koukaku_ruby_rose_gauntlet.id,
]

kaguneCombos.kagune_koukaku_blazing_slash_gauntlet = 3
kaguneCombos.kagune_koukaku_glacier_gauntlet = 3
kaguneCombos.kagune_koukaku_toxic_slisher = 3
kaguneCombos.kagune_koukaku_shroom_ward = 3
kaguneCombos.kakuja_golden_reaper_suit = 3
kaguneCombos.kagune_koukaku_ruby_rose_gauntlet = 3

export const koukaku3 = [
    BB.kagune_koukaku_crimson_gauntlet.id,
    BB.kagune_koukaku_rusted_crest.id,
    BB.kagune_koukaku_reinforced_plate.id,
    BB.kagune_koukaku_violet_rampart.id,
    BB.kakuja_crimson_bone_reaper_b.id,
    BB.kagune_koukaku_lilac_caraprace.id,
    BB.kagune_koukaku_cursed_bloody_slasher.id,
]

kaguneCombos.kagune_koukaku_crimson_gauntlet = 3
kaguneCombos.kagune_koukaku_rusted_crest = 3
kaguneCombos.kagune_koukaku_reinforced_plate = 3
kaguneCombos.kagune_koukaku_violet_rampart = 3
kaguneCombos.kakuja_crimson_bone_reaper_b = 3
kaguneCombos.kagune_koukaku_lilac_caraprace = 3
kaguneCombos.kagune_koukaku_cursed_bloody_slasher = 3

export const koukaku4 = [
    BB.kagune_koukaku_noir_caraprace.id,
    BB.kagune_koukaku_deadly_root_stinger.id,
    BB.kagune_koukaku_chained_slicer_gauntlet.id,
    BB.kagune_koukaku_razor_rampart.id,
    BB.kagune_koukaku_one_eyed_gauntlet.id,
    BB.kakuja_red_eyed_gauntlet.id,
    BB.kagune_koukaku_void_glove.id,
]

kaguneCombos.kagune_koukaku_noir_caraprace = 3
kaguneCombos.kagune_koukaku_deadly_root_stinger = 3
kaguneCombos.kagune_koukaku_chained_slicer_gauntlet = 3
kaguneCombos.kagune_koukaku_razor_rampart = 3
kaguneCombos.kagune_koukaku_one_eyed_gauntlet = 3
kaguneCombos.kakuja_red_eyed_gauntlet = 3
kaguneCombos.kagune_koukaku_void_glove = 3

export const koukaku5 = [
    BB.kakuja_toxic_reaper.id,
    BB.kakuja_skull_reaper.id,
    BB.kakuja_rusted_reaper_gauntlet.id,
    BB.kakuja_shappire_reaper_suit.id,
    BB.kakuja_violet_reaper_suit.id,
    BB.kakuja_vine_caraprace_gauntlet.id,
    BB.kagune_koukaku_crimson_gold_gauntlet.id,

]

kaguneCombos.kakuja_toxic_reaper = 3
kaguneCombos.kakuja_skull_reaper = 3
kaguneCombos.kakuja_rusted_reaper_gauntlet = 3
kaguneCombos.kakuja_shappire_reaper_suit = 3
kaguneCombos.kakuja_violet_reaper_suit = 3
kaguneCombos.kakuja_vine_caraprace_gauntlet = 3
kaguneCombos.kagune_koukaku_crimson_gold_gauntlet = 3

export const rinkaku1 = [
    BB.kagune_rinkaku_rusted_fang.id,
    BB.kagune_rinkaku_crimson_stinger.id,
    BB.kagune_rinkaku_crimson_eyed_flesh_eater.id,
    BB.kakuja_cursed_reaper.id,
    BB.kagune_rinkaku_rusted_flesh_grabber.id,
    BB.kakuja_violet_crimson_reaper.id,
    BB.kagune_rinkaku_reinforced_impact_tail.id,
    BB.kagune_rinkaku_noir_tailblade_whip.id,
]

kaguneCombos.kagune_rinkaku_rusted_fang = 1
kaguneCombos.kagune_rinkaku_crimson_stinger = 1
kaguneCombos.kagune_rinkaku_crimson_eyed_flesh_eater = 1
kaguneCombos.kakuja_cursed_reaper = 1
kaguneCombos.kagune_rinkaku_rusted_flesh_grabber = 1
kaguneCombos.kakuja_violet_crimson_reaper = 1
kaguneCombos.kagune_rinkaku_reinforced_impact_tail = 1
kaguneCombos.kagune_rinkaku_noir_tailblade_whip = 1

export const rinkaku2 = [
    BB.kagune_rinkaku_violet_fang_a.id,
    BB.kagune_rinkaku_toxic_coil_spine.id,
    BB.kakuja_reinforced_reaper.id,
    BB.kagune_rinkaku_crimson_eyed_slasher.id,
    BB.kakuja_reaper_blood_tailblade.id,
    BB.kagune_rinkaku_coral_spine_slasher.id,
    BB.kagune_rinkaku_glacier_tailblade_whip.id,
]
kaguneCombos.kagune_rinkaku_violet_fang_a = 1
kaguneCombos.kagune_rinkaku_toxic_coil_spine = 1    
kaguneCombos.kakuja_reinforced_reaper = 1
kaguneCombos.kagune_rinkaku_crimson_eyed_slasher = 1
kaguneCombos.kakuja_reaper_blood_tailblade = 1
kaguneCombos.kagune_rinkaku_coral_spine_slasher = 1
kaguneCombos.kagune_rinkaku_glacier_tailblade_whip = 1

export const rinkaku3 = [
    BB.kagune_rinkaku_razor_spine.id,
    BB.kakuja_bloody_tail_reaper.id,
    BB.kagune_rinkaku_bloody_stinger_fang.id,
    BB.kagune_rinkaku_ember_lava_fang.id,
    BB.kagune_rinkaku_crimson_gold_stinger.id,
    BB.kagune_rinkaku_heavy_crusher.id,
    BB.kagune_rinkaku_crimson_eyed_whip.id,
]

kaguneCombos.kagune_rinkaku_razor_spine = 2
kaguneCombos.kakuja_bloody_tail_reaper = 1
kaguneCombos.kagune_rinkaku_bloody_stinger_fang = 2
kaguneCombos.kagune_rinkaku_ember_lava_fang = 2
kaguneCombos.kagune_rinkaku_crimson_gold_stinger = 2
kaguneCombos.kagune_rinkaku_heavy_crusher = 2
kaguneCombos.kagune_rinkaku_crimson_eyed_whip = 2

export const rinkaku4 = [
    BB.kagune_rinkaku_rusted_branch_scythe.id,
    BB.kagune_rinkaku_reinforced_steel_whip.id,
    BB.kagune_rinkaku_reinforced_crusher_tail.id,
    BB.kagune_rinkaku_deadly_shroom_spine.id,
    BB.kagune_rinkaku_toxic_viper_whip.id,
    BB.kagune_rinkaku_tentacle_chainblade.id,
    BB.kagune_rinkaku_pink_petal_tail.id,
    BB.kagune_rinkaku_violet_fang_b.id,
]

kaguneCombos.kagune_rinkaku_rusted_branch_scythe = 2
kaguneCombos.kagune_rinkaku_reinforced_steel_whip = 2
kaguneCombos.kagune_rinkaku_reinforced_crusher_tail = 2
kaguneCombos.kagune_rinkaku_deadly_shroom_spine = 2
kaguneCombos.kagune_rinkaku_toxic_viper_whip = 2
kaguneCombos.kagune_rinkaku_tentacle_chainblade = 2
kaguneCombos.kagune_rinkaku_pink_petal_tail = 2
kaguneCombos.kagune_rinkaku_violet_fang_b = 2

export const ukaku1 = [
    BB.kagune_ukaku_blazing_lava_feather.id,
    BB.kagune_ukaku_golden_eyed_stinger.id,
    BB.kagune_ukaku_crimson_rusted_scythe.id,
    BB.kagune_ukaku_crimson_chained_feather.id,
    BB.kagune_ukaku_fiery_blaze_feather.id,
    BB.kagune_ukaku_maroon_eyed_flesh_eater.id,
    BB.kagune_ukaku_toxic_feather.id,
]
kaguneCombos.kagune_ukaku_blazing_lava_feather = 1
kaguneCombos.kagune_ukaku_golden_eyed_stinger = 1
kaguneCombos.kagune_ukaku_crimson_rusted_scythe = 1
kaguneCombos.kagune_ukaku_crimson_chained_feather = 1
kaguneCombos.kagune_ukaku_fiery_blaze_feather = 1
kaguneCombos.kagune_ukaku_maroon_eyed_flesh_eater = 1
kaguneCombos.kagune_ukaku_toxic_feather = 1

export const ukaku2 = [
    BB.kagune_ukaku_maroon_reinforced_feather.id,
    BB.kagune_ukaku_void_spine_feather.id,
    BB.kagune_ukaku_maroon_blood_crusher.id,
    BB.kagune_ukaku_bloody_eyed_feather.id,
    BB.kagune_ukaku_nature_scythe_wing.id,
    BB.kagune_ukaku_crimson_feather_tailblade.id,
    BB.kagune_ukaku_corroded_feather.id,
]

kaguneCombos.kagune_ukaku_maroon_reinforced_feather = 1
kaguneCombos.kagune_ukaku_void_spine_feather = 1
kaguneCombos.kagune_ukaku_maroon_blood_crusher = 1
kaguneCombos.kagune_ukaku_bloody_eyed_feather = 1
kaguneCombos.kagune_ukaku_nature_scythe_wing = 1
kaguneCombos.kagune_ukaku_crimson_feather_tailblade = 1
kaguneCombos.kagune_ukaku_corroded_feather = 1

export const ukaku3 = [
    BB.kagune_ukaku_rusted_feather.id,
    BB.kagune_ukaku_blitz_killer.id,
    BB.kagune_ukaku_crimson_blood_wing.id,
    BB.kagune_ukaku_petal_killer.id,
    BB.kakuja_bloody_wing_reaper.id,
    BB.kakuja_blazing_fire_reaper.id,
    BB.kagune_ukaku_devil_wing.id,
]

kaguneCombos.kagune_ukaku_rusted_feather = 3
kaguneCombos.kagune_ukaku_blitz_killer = 3
kaguneCombos.kagune_ukaku_crimson_blood_wing = 3
kaguneCombos.kagune_ukaku_petal_killer = 3
kaguneCombos.kakuja_bloody_wing_reaper = 3
kaguneCombos.kakuja_blazing_fire_reaper = 3
kaguneCombos.kagune_ukaku_devil_wing = 3

export const ukaku4 = [
    BB.kagune_ukaku_violet_blood_wing.id,
    BB.kagune_ukaku_pale_feather_tailblade.id,
    BB.kagune_ukaku_glacier_feather.id,
    BB.kagune_ukaku_sky_blue_killer.id,
    BB.kakuja_bloody_skull_reaper.id,
    BB.kakuja_violet_crimson_eye.id,
    BB.kagune_ukaku_corrupted_feather.id,
]

kaguneCombos.kagune_ukaku_violet_blood_wing = 3
kaguneCombos.kagune_ukaku_pale_feather_tailblade = 6
kaguneCombos.kagune_ukaku_glacier_feather = 3
kaguneCombos.kagune_ukaku_sky_blue_killer = 3
kaguneCombos.kakuja_bloody_skull_reaper = 3
kaguneCombos.kakuja_violet_crimson_eye = 3
kaguneCombos.kagune_ukaku_corrupted_feather = 3

export const kagunes = Object.keys(kaguneCombos)

export const quinques = [
    BB.quinque_blazing_heavy_sword.id,
    BB.quinque_bleeding_butcher.id,
    BB.quinque_blood_eyed_scythe.id,
    BB.quinque_breaker_club.id,
    BB.quinque_crimson_bone_pike.id,
    BB.quinque_crimson_eyed_axe.id,
    BB.quinque_crimson_eyed_chainsaw.id,
    BB.quinque_crimson_katana.id,
    BB.quinque_crimson_scythe.id,
    BB.quinque_crimson_sword.id,
    BB.quinque_double_edge_pike.id,
    BB.quinque_ego_sword.id,
    BB.quinque_groundshaker_hammer.id,
    BB.quinque_half_crimson_axe.id,
    BB.quinque_iron_cell_sword.id,
    BB.quinque_noir_greataxe.id,
    BB.quinque_noir_void_spear.id,
    BB.quinque_rampage_axe.id,
    BB.quinque_reinforced_anchor_blade.id,
    BB.quinque_ruby_blooded_sword.id,
    BB.quinque_silver_cell_trident.id,
    BB.quinque_skull_crusher.id,
    BB.quinque_toxic_trident.id,
    BB.quinque_wide_eyed_pike.id,
    BB.quinque_wiggly_vine_sword.id,
]

export const armors = [
    BB.armor_arata_suit_1.id,
    BB.armor_arata_suit_2.id,
    BB.armor_arata_suit_3.id,
    BB.armor_arata_suit_4.id,
    BB.armor_arata_suit_5.id,
    BB.armor_black_coat.id,
    BB.armor_black_reaper.id,
    BB.armor_blue_jacket.id,
    BB.armor_blue_overall.id,
    BB.armor_bunny_hoodie.id,
    BB.armor_chained_prisoner.id,
    BB.armor_clown_dress.id,
    BB.armor_green_outfit.id,
    BB.armor_leather_jacket.id,
    BB.armor_leprechaun.id,
    BB.armor_navy_outfit.id,
    BB.armor_noir_outfit.id,
    BB.armor_purple_outfit.id,
    BB.armor_purple_overall.id,
    BB.armor_shop_owner.id,
]

export const masks = [
    BB.head_black_red_mask.id,
    BB.head_blindfold.id,
    BB.head_blue_mask.id,
    BB.head_crimson_mask.id,
    BB.head_fang_mask.id,
    BB.head_gas_mask.id,
    BB.head_jason_mask.id,
    BB.head_kitsune_mask.id,
    BB.head_oni_mask.id,
    BB.head_plague_mask.id,
    BB.head_rabbit_mask.id,
    BB.head_red_skull_mask.id,
    BB.head_ski_mask.id,
    BB.head_tengu_mask.id,
    BB.head_xhead_mask.id,
]