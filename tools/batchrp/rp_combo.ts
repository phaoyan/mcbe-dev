import { attachable, NAME_SPACE } from "../utils";


export const rpCombo = (params: {
    typeId: string;
    bbmodelTpp: string;
    bbmodelFpp: string;
    comboFpps: string[];
    comboTpps: string[];
    idleFpp: string;
    idleTpp: string;
    trigger: boolean; // true for lclick, false for rclick
    comboMax: number;
}) => {
    return {
        format_version: "1.21.10",
        [attachable]: {
            description: {
                identifier: `${NAME_SPACE}:${params.typeId}`,
                textures: {
                    tpp: `textures/entity/${params.bbmodelTpp}_0`,
                    fpp: `textures/entity/${params.bbmodelFpp}_0`
                },
                geometry: {
                    tpp: `geometry.${NAME_SPACE}.${params.bbmodelTpp}`,
                    fpp: `geometry.${NAME_SPACE}.${params.bbmodelFpp}`
                },
                materials: {
                    default: "entity_alphatest"
                },
                render_controllers: [
                    {
                        "controller.render.tpp": "!c.is_first_person"
                    },
                    {
                        "controller.render.fpp": "c.is_first_person"
                    }
                ],
                animations: {
                    ctrl: "controller.animation.combo",
                    ...Array.from({ length: params.comboMax }, (_, i) => ({
                        [`combo${i + 1}_fpp`]: params.comboFpps[i],
                        [`combo${i + 1}_tpp`]: params.comboTpps[i]
                    })).reduce((acc, obj) => ({ ...acc, ...obj }), {}),
                    idle_fpp: params.idleFpp,
                    idle_tpp: params.idleTpp
                },
                scripts: {
                    parent_setup: "t.player_attacking = v.attack_time; t.is_using_item = q.is_using_item;",
                    animate: [
                        "ctrl"
                    ],
                    pre_animation: [
                        `v.combo_max = ${params.comboMax};`,
                        `v.trigger = ${params.trigger ? 1 : 0};`
                    ]
                }
            }
        }
    };
};