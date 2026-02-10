import * as path from "path";
import { BEHAVIOR_PACK_DIR, NAME_SPACE, readJson, writeJson, writeText } from "./utils";
import { Dialogues } from "../scripts/refs/dialogue";

type NpcDialogueSceneJson = {
    scene_tag: string;
    npc_name: string;
    text: string;
    on_open_commands: string[];
    on_close_commands: string[];
    buttons: Array<{
        name: string;
        commands: string[];
    }>;
};

type DialogueButton = { name: string; event?: string; to?: string };
type DialogueScene = { id: string; text: string; buttons: DialogueButton[] };

function capitalizeFirst(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function toNpcDialogueScene(args: {
    scene_tag: string;
    npc_name: string;
    text: string;
    buttons: DialogueButton[];
}): NpcDialogueSceneJson {
    return {
        scene_tag: args.scene_tag,
        npc_name: args.npc_name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
        text: args.text,
        on_open_commands: [],
        on_close_commands: [],
        buttons: (args.buttons ?? []).map((b) => {
            const commands: string[] = [];

            if (b.event) {
                commands.push(`/scriptevent ${NAME_SPACE}:${b.event}`);
            }
            if (b.to) {
                const toTag = b.to;
                commands.push(`dialogue change @s ${toTag}`);
                commands.push(`dialogue open @s @p ${toTag}`);
            }

            return {
                name: b.name,
                commands,
            };
        }),
    };
}

function upsertScenes(existing: NpcDialogueSceneJson[], updates: NpcDialogueSceneJson[]): NpcDialogueSceneJson[] {
    const updateMap = new Map<string, NpcDialogueSceneJson>();
    for (const s of updates) updateMap.set(s.scene_tag, s);

    const targetTags = new Set(updateMap.keys());
    const merged = existing.map((s) => (targetTags.has(s.scene_tag) ? updateMap.get(s.scene_tag)! : s));

    // 对于不存在于原文件中的新 scene，追加到末尾（PoC 下通常不会发生）
    const existingTags = new Set(existing.map((s) => s.scene_tag));
    for (const s of updates) {
        if (!existingTags.has(s.scene_tag)) merged.push(s);
    }

    return merged;
}

/**
 * 部署 MissionDialogueList 中所有配置的 NPC 对话
 */
export function deployAllDialogues(): void {
    const targetPath = path.join(BEHAVIOR_PACK_DIR, "dialogue", "generated_dialogue.scene.json");
    const data = readJson(targetPath);

    data.format_version = data.format_version ?? "1.17";
    const npcDialogue = data["minecraft:npc_dialogue"] ?? {};
    let scenes: NpcDialogueSceneJson[] = npcDialogue.scenes ?? [];

    for (const [npcKey, npcData] of Object.entries(Dialogues)) {
        for (const [missionKey, missionData] of Object.entries(npcData as any)) {
            const npcName = capitalizeFirst(npcKey);
            const sceneKeyToTag = (key: string) => `${npcKey}_${missionKey}_${key}`;
            const conf = missionData as { scenes: Record<string, DialogueScene> };

            if (!conf.scenes) continue;

            const sceneEntries = Object.entries(conf.scenes);
            const updates = sceneEntries.map(([sceneKey, sceneDef], index) => {
                if (typeof sceneDef?.id !== "string") {
                    throw new Error(`MissionDialogueList missing id for ${npcKey}.${missionKey}.scenes.${sceneKey}`);
                }
                if (typeof sceneDef?.text !== "string") {
                    throw new Error(`MissionDialogueList missing text for ${npcKey}.${missionKey}.scenes.${sceneKey}`);
                }

                const buttons = (sceneDef.buttons ?? []).map(b => {
                    // 智能识别：如果是 "Next" 按钮且没有指定 to，自动指向下一个场景
                    if ((b.name === "Next" || b.name === "Next.") && !b.to && index < sceneEntries.length - 1) {
                        return { ...b, to: sceneEntries[index + 1][0] };
                    }
                    return b;
                });

                return toNpcDialogueScene({
                    scene_tag: sceneDef.id,
                    npc_name: npcName,
                    text: sceneDef.text,
                    buttons: buttons,
                });
            });

            scenes = upsertScenes(scenes, updates);
        }
    }

    data["minecraft:npc_dialogue"] = {
        ...npcDialogue,
        scenes: scenes,
    };

    writeJson(targetPath, data);
}

/**
 * 根据 MissionDialogueList 生成 markdown 文档便于阅读
 */
export function exportDialogueMarkdown(): void {
    const outputPath = path.join(__dirname, "outputs", "dialogue.md");
    let markdown = "# NPC 对话列表\n\n";

    for (const [npcKey, npcData] of Object.entries(Dialogues)) {
        markdown += `## NPC: ${capitalizeFirst(npcKey)} (${npcKey})\n\n`;
        for (const [missionKey, missionData] of Object.entries(npcData as any)) {
            markdown += `### Mission: ${missionKey}\n\n`;
            const conf = missionData as { scenes: Record<string, DialogueScene> };
            if (!conf.scenes) {
                markdown += "_No scenes defined._\n\n";
                continue;
            }

            for (const [sceneKey, sceneDef] of Object.entries(conf.scenes)) {
                markdown += `#### Scene: ${sceneKey}\n\n`;
                const renderedText = sceneDef.text
                    .replace(/\n/g, " ")
                    .replace(/§e/g, `<span style="color:#f1c40f">`)
                    .replace(/§6/g, `<span style="color:#e67e22">`)
                    .replace(/§a/g, `<span style="color:#2ecc71">`)
                    .replace(/§r/g, "</span>");
                markdown += `${renderedText}\n\n`;

                if (sceneDef.buttons && (sceneDef.buttons as any[]).length > 0) {
                    for (const button of sceneDef.buttons as any[]) {
                        const targets: string[] = [];
                        if (button.event) targets.push(`Event: \`${button.event}\``);
                        if (button.to) targets.push(`To: \`${button.to}\``);
                        markdown += `- ${button.name}${targets.length > 0 ? ` (${targets.join(", ")})` : ""}\n`;
                    }
                }
                markdown += "\n";
            }
            markdown += "---\n\n";
        }
    }

    writeText(outputPath, markdown);
    console.log(`[Dialogue] Markdown exported to: ${outputPath}`);
}

export async function main(): Promise<void> {
    deployAllDialogues();
    exportDialogueMarkdown();
}

if (require.main === module) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

