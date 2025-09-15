import { Entity, EntityDamageCause, EquipmentSlot, ItemStack } from "@minecraft/server"
import { DPUtils } from "./dp_utils"
import { DamageTags } from "../lists/damage_list"
import { InventoryUtils } from "./inventory_utils"

// 伤害公式：技能倍率×攻击力×（1+暴击率×暴击伤害）×攻击方伤害加成×防御方伤害减免×（攻击方防御力/防御方防御力）×调节常数
export interface DamageAttribute {
    atk: number
    def: number
    critRate: number
    critDmg: number
    atkBonus: {id: string, tag: string, bonus: number}[]
    defBonus: {id: string, tag: string, bonus: number}[]
}

export const DAMAGE_ADJUST_CONSTANT = 1

export const DEFAULT_ENTITY_ATTRIBUTE: DamageAttribute = {
    atk: 1,
    def: 1,
    critRate: 0,
    critDmg: 0,
    atkBonus: [],
    defBonus: []
}

export const DEFAULT_ITEM_ATTRIBUTE: DamageAttribute = {
    atk: 0,
    def: 0,
    critRate: 0,
    critDmg: 0,
    atkBonus: [],
    defBonus: []
}

export class DamageUtils {
    
    static setItemAttribute(target: ItemStack, attribute: Partial<DamageAttribute>) {
        DPUtils.store().damage_attribute.set(target, {
            atk: attribute.atk ?? 0,
            def: attribute.def ?? 0,
            critRate: attribute.critRate ?? 0,
            critDmg: attribute.critDmg ?? 0,
            atkBonus: attribute.atkBonus ?? [],
            defBonus: attribute.defBonus ?? []
        }, DEFAULT_ITEM_ATTRIBUTE)
    }

    static tempAttribute(entity: Entity, attribute: DamageAttribute, ticks: number){
        DPUtils.store().damage_attribute.set(entity, (curr: DamageAttribute)=>{
            return {
                atk: curr.atk + attribute.atk,
                def: curr.def + attribute.def,
                critRate: curr.critRate + attribute.critRate,
                critDmg: curr.critDmg + attribute.critDmg,
                atkBonus: [...curr.atkBonus, ...attribute.atkBonus],
                defBonus: [...curr.defBonus, ...attribute.defBonus]
            }
        }, DEFAULT_ENTITY_ATTRIBUTE)
        DPUtils.store().damage_attribute.set(entity, (curr: DamageAttribute)=>{
            return {
                atk: curr.atk - attribute.atk,
                def: curr.def - attribute.def,
                critRate: curr.critRate - attribute.critRate,
                critDmg: curr.critDmg - attribute.critDmg,
                atkBonus: curr.atkBonus.filter(bonus => !attribute.atkBonus.some(b => b.id === bonus.id)),
                defBonus: curr.defBonus.filter(bonus => !attribute.defBonus.some(b => b.id === bonus.id))
            }
        }, DEFAULT_ENTITY_ATTRIBUTE, ticks)
    }
    
    static damageAttribute(entity: Entity){
        let attribute = DPUtils.store().damage_attribute.curr(entity, DEFAULT_ENTITY_ATTRIBUTE)
        const equippables = InventoryUtils.equippables(entity);
        [
            equippables?.getEquipment(EquipmentSlot.Head),
            equippables?.getEquipment(EquipmentSlot.Chest),
            equippables?.getEquipment(EquipmentSlot.Legs),
            equippables?.getEquipment(EquipmentSlot.Feet),
            equippables?.getEquipment(EquipmentSlot.Mainhand),
            equippables?.getEquipment(EquipmentSlot.Offhand),
        ].forEach(item => {
            if (!item) return
            const itemAttribute = DPUtils.store().damage_attribute.curr(item, DEFAULT_ITEM_ATTRIBUTE)
            attribute.atk += itemAttribute.atk ?? 0
            attribute.def += itemAttribute.def ?? 0
            attribute.critRate += itemAttribute.critRate ?? 0
            attribute.critDmg += itemAttribute.critDmg ?? 0
            attribute.atkBonus.push(...itemAttribute.atkBonus)
            attribute.defBonus.push(...itemAttribute.defBonus)
        })
        return attribute
    }

    static damage(damageRate: number, defender: Entity, attacker?: Entity, tags: string[] = []){
        const defenderAttribute = this.damageAttribute(defender)
        const attackerAttribute = attacker ? this.damageAttribute(attacker) : DEFAULT_ENTITY_ATTRIBUTE

        // 1. 技能倍率（damageId）暂时假设为1，后续可扩展为根据damageId查表
        const skillRatio = damageRate

        // 2. 攻击力
        const atk = attackerAttribute.atk ?? DEFAULT_ENTITY_ATTRIBUTE.atk

        // 3. 暴击率与暴击伤害
        let critRate = attackerAttribute.critRate ?? DEFAULT_ENTITY_ATTRIBUTE.critRate
        let critDmg = attackerAttribute.critDmg ?? DEFAULT_ENTITY_ATTRIBUTE.critDmg

        // 4. 计算暴击（暴击率最大为1）
        critRate = Math.min(critRate, 1)
        const isCrit = Math.random() < critRate
        const critMultiplier = isCrit ? (1 + critDmg) : 1

        // 5. 攻击方伤害加成（加算）
        let atkBonus = 0
        const tagsWithCommon = tags.includes(DamageTags.Common) ? tags : [...tags, DamageTags.Common]
        if (attackerAttribute.atkBonus) {
            for (const bonus of attackerAttribute.atkBonus) {
                if (tagsWithCommon.includes(bonus.tag)) {
                    atkBonus += bonus.bonus
                }
            }
        }
        atkBonus = 1 + atkBonus

        // 6. 防御方伤害减免（加算）
        let defBonus = 0
        const defTagsWithCommon = tags.includes(DamageTags.Common) ? tags : [...tags, DamageTags.Common]
        if (defenderAttribute.defBonus) {
            for (const bonus of defenderAttribute.defBonus) {
                if (defTagsWithCommon.includes(bonus.tag)) {
                    defBonus += bonus.bonus
                }
            }
        }
        defBonus = 1 - defBonus

        // 7. 攻击方防御力/防御方防御力
        const attackerDef = attackerAttribute.def ?? DEFAULT_ENTITY_ATTRIBUTE.def
        const defenderDef = defenderAttribute.def ?? DEFAULT_ENTITY_ATTRIBUTE.def
        const defRatio = defenderDef > 0 ? (attackerDef / defenderDef) : 1

        // 8. 计算最终伤害
        let damage = skillRatio * atk * critMultiplier * atkBonus * defBonus * defRatio

        // 9. 保证伤害不小于1
        damage = Math.max(1, Math.floor(damage))
        
        // 10. 造成伤害
        try {
            defender.applyDamage(damage * DAMAGE_ADJUST_CONSTANT, { damagingEntity: attacker, cause: EntityDamageCause.entityAttack })
        } catch (e) {
            // 兼容性处理
            defender.applyDamage(damage * DAMAGE_ADJUST_CONSTANT)
        }
        
    }
}