import { Entity, EntityComponentTypes, EntityEquippableComponent, EntityHealthComponent, EntityIsShearedComponent, EntityTypeFamilyComponent, EntityVariantComponent, EntityInventoryComponent, EntityItemComponent, EntityOnFireComponent, EntityRideableComponent, EntityAgeableComponent, EntityBreathableComponent, EntityCanClimbComponent, EntityCanFlyComponent, EntityCanPowerJumpComponent, EntityColorComponent, EntityColor2Component, EntityFireImmuneComponent, EntityFloatsInLiquidComponent, EntityFlyingSpeedComponent, EntityFrictionModifierComponent, EntityHealableComponent, EntityIsBabyComponent, EntityIsChargedComponent, EntityIsChestedComponent, EntityIsDyeableComponent, EntityIsHiddenWhenInvisibleComponent, EntityIsIgnitedComponent, EntityIsIllagerCaptainComponent, EntityIsSaddledComponent, EntityIsShakingComponent, EntityIsStackableComponent, EntityIsStunnedComponent, EntityIsTamedComponent, EntityLavaMovementComponent, EntityLeashableComponent, EntityMarkVariantComponent, EntityMovementComponent, EntityMovementAmphibiousComponent, EntityMovementBasicComponent, EntityMovementFlyComponent } from "@minecraft/server";

// 驼峰命名到组件类型的映射
type ComponentMap = {
    health: EntityHealthComponent;
    typeFamily: EntityTypeFamilyComponent;
    variant: EntityVariantComponent;
    equippable: EntityEquippableComponent;
    isSheared: EntityIsShearedComponent;
    inventory: EntityInventoryComponent;
    item: EntityItemComponent;
    onFire: EntityOnFireComponent;
    rideable: EntityRideableComponent;
    ageable: EntityAgeableComponent;
    breathable: EntityBreathableComponent;
    canClimb: EntityCanClimbComponent;
    canFly: EntityCanFlyComponent;
    canPowerJump: EntityCanPowerJumpComponent;
    color: EntityColorComponent;
    color2: EntityColor2Component;
    fireImmune: EntityFireImmuneComponent;
    floatsInLiquid: EntityFloatsInLiquidComponent;
    flyingSpeed: EntityFlyingSpeedComponent;
    frictionModifier: EntityFrictionModifierComponent;
    healable: EntityHealableComponent;
    isBaby: EntityIsBabyComponent;
    isCharged: EntityIsChargedComponent;
    isChested: EntityIsChestedComponent;
    isDyeable: EntityIsDyeableComponent;
    isHiddenWhenInvisible: EntityIsHiddenWhenInvisibleComponent;
    isIgnited: EntityIsIgnitedComponent;
    isIllagerCaptain: EntityIsIllagerCaptainComponent;
    isSaddled: EntityIsSaddledComponent;
    isShaking: EntityIsShakingComponent;
    isStackable: EntityIsStackableComponent;
    isStunned: EntityIsStunnedComponent;
    isTamed: EntityIsTamedComponent;
    lavaMovement: EntityLavaMovementComponent;
    leashable: EntityLeashableComponent;
    markVariant: EntityMarkVariantComponent;
    movement: EntityMovementComponent;
    movementAmphibious: EntityMovementAmphibiousComponent;
    movementBasic: EntityMovementBasicComponent;
    movementFly: EntityMovementFlyComponent;
};

// 代理类型
type CompUtils = {
    [K in keyof ComponentMap]: (entity: Entity) => ComponentMap[K];
} & {
    has<T extends keyof ComponentMap>(entity: Entity, componentType: T): boolean;
    get<T extends keyof ComponentMap>(entity: Entity, componentType: T): ComponentMap[T];
};

// 创建动态代理
const createCompUtils = (): CompUtils => {
    return new Proxy({} as CompUtils, {
        get(target, prop: string) {
            if (prop === 'has') {
                return function <T extends keyof ComponentMap>(entity: Entity, componentType: T): boolean {
                    return entity.hasComponent(EntityComponentTypes[componentType.charAt(0).toUpperCase() + componentType.slice(1) as keyof typeof EntityComponentTypes]);
                };
            }

            if (prop === 'get') {
                return function <T extends keyof ComponentMap>(entity: Entity, componentType: T): ComponentMap[T] {
                    return entity.getComponent(EntityComponentTypes[componentType.charAt(0).toUpperCase() + componentType.slice(1) as keyof typeof EntityComponentTypes]) as ComponentMap[T];
                };
            }

            // 将驼峰命名转换为 PascalCase 以匹配 EntityComponentTypes
            const componentType = prop.replace(/([A-Z])/g, '_$1').toUpperCase();

            return function (entity: Entity) {
                const componentTypeEnum = EntityComponentTypes[componentType as keyof typeof EntityComponentTypes];
                if (!componentTypeEnum) {
                    throw new Error(`Unknown component type: ${componentType}`);
                }
                return entity.getComponent(componentTypeEnum) as any;
            };
        }
    }) as CompUtils;
};

// 导出单一的 CompUtils 对象
export const CompUtils = createCompUtils();