import * as path from 'path';
import {
    RESOURCE_PACK_DIR,
    writeJson,
    ensureDir,
} from './utils';
import { 
    mobs, 
    effects, 
    npcs, 
    bosses, 
    miniBosses, 
    quinques, 
    armors, 
    masks, 
    bikaku1,
    bikaku2, 
    bikaku3, 
    bikaku4, 
    bikaku5, 
    koukaku1,
    koukaku2, 
    koukaku3,
    koukaku4,
    rinkaku1,
    rinkaku2,
    rinkaku3,
    rinkaku4,
    ukaku1,
    ukaku2,
    ukaku3,
    ukaku4,
    koukaku5,
} from './data';
import { rpMob, rpMobWithSkin } from './batchrp/rp_mob';
import { rpEffect } from './batchrp/rp_effect';
import { rpKaguneArmorGroup, rpKaguneRc, rpKaguneSkillGroup } from './batchrp/rp_kagune';
import { rpArmor } from './batchrp/rp_armor';
import { rpQuinque } from './batchrp/rp_quinque';

const ignores: string[] = []

// 导出数据函数
const exportData = (data: any, name: string): void => {
    if (ignores.includes(name.split('/').pop() || '')) return;

    const type = data["minecraft:client_entity"] ? "ce" : "att";
    const filename = `${name}.${type}.json`;

    const targetPath = type === "ce"
        ? path.join(RESOURCE_PACK_DIR, "entity", filename)
        : path.join(RESOURCE_PACK_DIR, "attachables", "items", filename);

    ensureDir(path.dirname(targetPath));
    writeJson(targetPath, data);
};

const exportAc = (data: any, name: string) => {
    const targetPath = path.join(RESOURCE_PACK_DIR, "animation_controllers", `${name}.ac.json`);
    writeJson(targetPath, data);
}

const exportRc = (data: any, name: string) => {
    const targetPath = path.join(RESOURCE_PACK_DIR, "render_controllers", `${name}.rc.json`);
    writeJson(targetPath, data);
}


// 读取bbmodel配置
/**
 * 主函数
 */
export async function main(): Promise<void> {
    bosses.forEach(mob => exportData(rpMob(mob), `mobs/${mob}`))
    exportData(rpMob("boss_alex_voss_boss", { extraAnimate: ["stage2"] }), `mobs/boss_alex_voss_boss`)
    exportData(rpMob("boss_one_eyed_martial_king", { extraAnimate: ["idlefx"] }), `mobs/boss_one_eyed_martial_king`)

    miniBosses.forEach(mob => exportData(rpMob(mob), `mobs/${mob}`))
    mobs.forEach(mob => exportData(rpMobWithSkin(mob), `mobs/${mob}`))
    npcs.forEach(npc => exportData(rpMob(npc), `npcs/${npc}`))

    effects.forEach(skillModel => exportData(rpEffect(skillModel), `effects/mobs/${skillModel}`))
    exportData(rpEffect("effect_boss_crimson_crow_reaper_monster", "effect_boss_crimson_crow_reaper_monster", { extraAnimate: ["attack"] }), `effects/mobs/effect_boss_crimson_crow_reaper_monster`)

    const rpKaguneGroup = (kagunes: string[])=>{
        rpKaguneArmorGroup(kagunes).forEach(item => exportData(item.data, `kagunes/armor/${item.typeId}`))
        rpKaguneSkillGroup(kagunes).forEach(item => exportData(item.data, `kagunes/skill/${item.typeId}`))
    }
    const kaguneGroups = [
        bikaku1,
        bikaku2,
        bikaku3,
        bikaku4,
        bikaku5,
        koukaku1,
        koukaku2,
        koukaku3,
        koukaku4,
        koukaku5,
        rinkaku1,
        rinkaku2,
        rinkaku3,
        rinkaku4,
        ukaku1,
        ukaku2,
        ukaku3,
        ukaku4,
    ]
    kaguneGroups.forEach(group => rpKaguneGroup(group))

    exportRc(rpKaguneRc([
        ...(kaguneGroups.flat()),
        ...quinques,
    ]), `kagunes`);

    quinques.forEach(typeId => exportData(rpQuinque(`${typeId}`, `${typeId}_fpp`, typeId), `quinques/${typeId}`));

    [...bikaku1, ...bikaku2, ...bikaku3, ...bikaku4, ...bikaku5].forEach(typeId => exportData(rpEffect(typeId, `effect_${typeId}`), `effects/bikaku/${typeId}`));
    [...koukaku1, ...koukaku2, ...koukaku3, ...koukaku4, ...koukaku5].forEach(typeId => exportData(rpEffect(typeId, `effect_${typeId}`), `effects/koukaku/${typeId}`));
    [...rinkaku1, ...rinkaku2, ...rinkaku3, ...rinkaku4].forEach(typeId => exportData(rpEffect(typeId, `effect_${typeId}`), `effects/rinkaku/${typeId}`));
    [...ukaku1, ...ukaku2, ...ukaku3, ...ukaku4].forEach(typeId => exportData(rpEffect(typeId, `effect_${typeId}`), `effects/ukaku/${typeId}`));
    quinques.forEach(typeId => exportData(rpEffect(typeId, `effect_${typeId}`), `effects/quinque/${typeId}`));


    armors.forEach(armor => exportData(rpArmor(armor), `armors/${armor}`))
    masks.forEach(mask => exportData(rpArmor(mask), `masks/${mask}`))
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}