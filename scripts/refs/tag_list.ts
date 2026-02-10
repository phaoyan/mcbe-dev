import { Entity } from "@minecraft/server"

export const TagList = {
    TargetedBy: (entityId: string) => `minecraft_dev:targeted_by_${entityId}`
}