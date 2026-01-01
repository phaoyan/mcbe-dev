import ref from "./ref.json";

/**
 * 统一从 ref.json 暴露各类引用数据，避免在业务代码里到处 import 多个 json 文件。
 * 这里做一次集中式的类型断言（运行时仍然是纯 JSON 对象）。
 */
export const refs = ref as any;

// 常用引用（当前工程脚本有直接依赖的）
export const nameSpace = refs.name_space;
export const animationTree = refs.animation_tree;
export const animationLength = refs.animation_length;
export const attachableAnimations = refs.attachable_animations;
export const entityTree = refs.entity_tree;
export const entityIds = refs.entity_ids;
export const blockTree = refs.block_tree;
export const blockIds = refs.block_ids;
export const bbmodel = refs.bbmodel;

export default ref;


