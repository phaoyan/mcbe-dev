import * as path from 'path';
import {
    BEHAVIOR_PACK_DIR,
    writeJson,
    ensureDir
} from './utils';
import { armors, bosses, effects, koukaku5, masks, miniBosses, npcs, quinques } from './data';
import { bikaku1, bikaku2, bikaku3, bikaku4, bikaku5 } from './data';
import { koukaku1, koukaku2, koukaku3, koukaku4 } from './data';
import { rinkaku1, rinkaku2, rinkaku3, rinkaku4 } from './data';
import { ukaku1, ukaku2, ukaku3, ukaku4 } from './data';
import { bpMob, bpMobWithSkin } from './batchbp/bp_mob';
import { bpEffect } from './batchbp/bp_effect';
import { bpNpc } from './batchbp/bp_npc';
import { bpArmor } from './batchbp/bp_armor';
import { bpRclick } from './batchbp/bp_rclick';

const ignores = [
    "effect_boss_crimson_crow_reaper_monster",
]

// 导出数据函数
const exportData = (data: any, name: string): void => {
    if (ignores.includes(name.split('/').pop() || '')) return;

    const type = data["minecraft:entity"] ? "se" : "item";
    const filename = `${name}.${type}.json`;

    const targetPath = type === "se"
        ? path.join(BEHAVIOR_PACK_DIR, "entities", filename)
        : path.join(BEHAVIOR_PACK_DIR, "items", filename);

    ensureDir(path.dirname(targetPath));
    writeJson(targetPath, data);
};

const exportBosses = ()=>{
    bosses.forEach(mob => exportData(bpMob({ typeId: mob, boss: true }), `mobs/bosses/${mob}`))
    exportData(bpMob({ 
        typeId: "boss_void_darkness_king", 
        boss: true,
        health: 1000,
        movementFightMultiplier: 1.2
    }), `mobs/bosses/boss_void_darkness_king`)
    exportData(bpMob({ 
        typeId: "boss_one_eyed_blood_king", 
        boss: true,
        health: 800,
        fallDamageImmune: true
    }), `mobs/bosses/boss_one_eyed_blood_king`)
    exportData(bpMob({ 
        typeId: "boss_crimson_crow_reaper", 
        boss: true,
        health: 900,
        movement: 0.3,
        movementFightMultiplier: 1
    }), `mobs/bosses/boss_crimson_crow_reaper`)
    exportData(bpMob({ 
        typeId: "boss_crimson_one_eyed_owl", 
        boss: true,
        health: 1200,
        movement: 0.25,
        movementFightMultiplier: 1
    }), `mobs/bosses/boss_crimson_one_eyed_owl`)
    exportData(bpMob({ 
        typeId: "boss_grim_reaper", 
        boss: true,
        health: 800,
    }), `mobs/bosses/boss_grim_reaper`)
    exportData(bpMob({ 
        typeId: "boss_alex_voss_boss", 
        boss: true,
        collisionBox: [0.8,1.8],
        movementFightMultiplier: 1.3,
        health: 1500,
        properties: {
            "ns_gl:boss_alex_voss_boss_stage2": {
                "type": "int",
                "range": [ 0, 1 ],
                "default": 0,
                "client_sync": true
            }
        }
    }), `mobs/bosses/boss_alex_voss_boss`)
    exportData(bpMob({ 
        typeId: "boss_one_eyed_martial_king", 
        boss: true,
        health: 1200,
    }), `mobs/bosses/boss_one_eyed_martial_king`)
    exportData(bpMob({ 
        typeId: "boss_blinded_deceiver", 
        boss: true,
        health: 900,
    }), `mobs/bosses/boss_blinded_deceiver`)
    exportData(bpMob({ 
        typeId: "boss_crimson_eyed", 
        boss: true,
        health: 800,
    }), `mobs/bosses/boss_crimson_eyed`)
    exportData(bpMob({ 
        typeId: "boss_one_eyed_crimson_king", 
        boss: true,
        health: 1000,
    }), `mobs/bosses/boss_one_eyed_crimson_king`)
}

const exportMiniBosses = ()=>{
    miniBosses.forEach(mob => exportData(bpMob({ typeId: mob, boss: true }), `mobs/mini_bosses/${mob}`))
    exportData(bpMob({
        typeId: "mini_boss_lunaris",
        boss: true,
        health: 200,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 1.2
    }), `mobs/mini_bosses/mini_boss_lunaris`)
    exportData(bpMob({
        typeId: "mini_boss_investigator_mark",
        boss: true,
        health: 350,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 1.2
    }), `mobs/mini_bosses/mini_boss_investigator_mark`)
    exportData(bpMob({
        typeId: "mini_boss_steellion",
        boss: true,
        health: 300,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 1.2
    }), `mobs/mini_bosses/mini_boss_steellion`)
    exportData(bpMob({
        typeId: "mini_boss_vale",
        boss: true,
        health: 340,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 1.2
    }), `mobs/mini_bosses/mini_boss_vale`)
    exportData(bpMob({
        typeId: "mini_boss_investigator_jack",
        boss: true,
        health: 350,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 1.3
    }), `mobs/mini_bosses/mini_boss_investigator_jack`)
    exportData(bpMob({
        typeId: "mini_boss_rabbit",
        boss: true,
        health: 250,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 2
    }), `mobs/mini_bosses/mini_boss_rabbit`)
    exportData(bpMob({
        typeId: "mini_boss_gecko",
        boss: true,
        health: 350,
        collisionBox: [0.8, 2],
        movementFightMultiplier: 1.2
    }), `mobs/mini_bosses/mini_boss_gecko`)
    exportData(bpMob({
        typeId: "mini_boss_rook",
        boss: true,
        health: 300,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 2
    }), `mobs/mini_bosses/mini_boss_rook`)
    exportData(bpMob({
        typeId: "mini_boss_lira",
        boss: true,
        health: 250,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 1.3
    }), `mobs/mini_bosses/mini_boss_lira`)
    exportData(bpMob({
        typeId: "mini_boss_masa",
        boss: true,
        health: 400,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 1.7
    }), `mobs/mini_bosses/mini_boss_masa`)
    exportData(bpMob({
        typeId: "mini_boss_haru",
        boss: true,
        health: 250,
        collisionBox: [0.6, 1.8],
        movementFightMultiplier: 1.3
    }), `mobs/mini_bosses/mini_boss_haru`)
}

const exportMobs = ()=>{    
    exportData(bpMobWithSkin("mob_hungry_ghoul", { 
        typeId: "mob_hungry_ghoul", 
        movementFightMultiplier: 1, 
        movement: 0.2, 
        health: 18,
        collisionBox: [0.6,1.8] 
    }), `mobs/mobs/mob_hungry_ghoul`)
    exportData(bpMobWithSkin("mob_feral_ghoul", { 
        typeId: "mob_feral_ghoul", 
        movementFightMultiplier: 1.5, 
        movement: 0.2, 
        health: 18,
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_feral_ghoul`)
    exportData(bpMobWithSkin("mob_lurking_ghoul", { 
        typeId: "mob_lurking_ghoul", 
        health: 15,
        movementFightMultiplier: 2, 
        movement: 0.2, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_lurking_ghoul`)
    exportData(bpMobWithSkin("mob_angry_ghoul", { 
        typeId: "mob_angry_ghoul", 
        health: 25,
        movementFightMultiplier: 1.5, 
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_angry_ghoul`)
    exportData(bpMobWithSkin("mob_brute_ghoul", { 
        typeId: "mob_brute_ghoul", 
        health: 30,
        movementFightMultiplier: 1.5, 
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_brute_ghoul`)
    exportData(bpMobWithSkin("mob_nightmare_ghoul", { 
        typeId: "mob_nightmare_ghoul", 
        health: 30,
        movementFightMultiplier: 0.8, 
        movement: 0.2, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_nightmare_ghoul`)
    exportData(bpMobWithSkin("mob_regular_investigator_male", { 
        typeId: "mob_regular_investigator_male", 
        movementFightMultiplier: 1.3, 
        health: 18,
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_regular_investigator_male`)
    exportData(bpMobWithSkin("mob_regular_investigator_female", { 
        typeId: "mob_regular_investigator_female", 
        movementFightMultiplier: 1.3, 
        health: 20,
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_regular_investigator_female`)
    exportData(bpMobWithSkin("mob_patrol_leader_male", { 
        typeId: "mob_patrol_leader_male", 
        health: 25,
        movementFightMultiplier: 1.3, 
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_patrol_leader_male`)
    exportData(bpMobWithSkin("mob_patrol_leader_female", { 
        typeId: "mob_patrol_leader_female", 
        health: 25,
        movementFightMultiplier: 1.3, 
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_patrol_leader_female`)
    exportData(bpMobWithSkin("mob_tactical_agent", { 
        typeId: "mob_tactical_agent", 
        health: 25,
        movementFightMultiplier: 1.5, 
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_tactical_agent`)
    exportData(bpMobWithSkin("mob_combat_investigator", { 
        typeId: "mob_combat_investigator", 
        health: 25,
        movementFightMultiplier: 1.5, 
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_combat_investigator`)
    exportData(bpMobWithSkin("mob_investigator_leader", { 
        typeId: "mob_investigator_leader", 
        health: 40,
        movementFightMultiplier: 0.8, 
        movement: 0.2, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_investigator_leader`)
    exportData(bpMobWithSkin("mob_first_class_investigator", { 
        typeId: "mob_first_class_investigator", 
        health: 40,
        movementFightMultiplier: 1.5, 
        movement: 0.25, 
        collisionBox: [0.8,1.8] 
    }), `mobs/mobs/mob_first_class_investigator`)
}

/**
 * 主函数
 */
export async function main(): Promise<void> {

    exportBosses()
    exportMiniBosses()
    exportMobs()

    npcs.forEach(npc => exportData(bpNpc(npc), `npcs/${npc}`))
    effects.forEach(effect => exportData(bpEffect(effect), `effects/mobs/${effect}`));
    [
        ...bikaku1, ...bikaku2, ...bikaku3, ...bikaku4, ...bikaku5, 
        ...koukaku1, ...koukaku2, ...koukaku3, ...koukaku4, ...koukaku5,
        ...rinkaku1, ...rinkaku2, ...rinkaku3, ...rinkaku4, 
        ...ukaku1, ...ukaku2, ...ukaku3, ...ukaku4
    ].forEach(kagune => {
        exportData(bpArmor(`kagune_armor_${kagune}`, "chest"), `kagunes/armor/kagune_armor_${kagune}`)
        exportData(bpRclick(`kagune_skill_${kagune}`, 1), `kagunes/skill/kagune_skill_${kagune}`)
    });

    [...bikaku1, ...bikaku2, ...bikaku3, ...bikaku4, ...bikaku5].forEach(typeId => exportData(bpEffect(`effect_${typeId}`), `effects/bikaku/${typeId}`));
    [...koukaku1, ...koukaku2, ...koukaku3, ...koukaku4, ...koukaku5].forEach(typeId => exportData(bpEffect(`effect_${typeId}`), `effects/koukaku/${typeId}`));
    [...rinkaku1, ...rinkaku2, ...rinkaku3, ...rinkaku4].forEach(typeId => exportData(bpEffect(`effect_${typeId}`), `effects/rinkaku/${typeId}`));
    [...ukaku1, ...ukaku2, ...ukaku3, ...ukaku4].forEach(typeId => exportData(bpEffect(`effect_${typeId}`), `effects/ukaku/${typeId}`));
    quinques.forEach(typeId => exportData(bpEffect(`effect_${typeId}`), `effects/quinque/${typeId}`))

    quinques.forEach(typeId => exportData(bpRclick(typeId, 1), `quinques/${typeId}`))

    armors.forEach(armor => exportData(bpArmor(armor, "chest"), `armors/${armor}`))
    masks.forEach(mask => exportData(bpArmor(mask, "head"), `masks/${mask}`))
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}