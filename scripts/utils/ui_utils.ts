import { ActionFormData } from "@minecraft/server-ui";
import { Entity, GameMode, Player, system, world } from "@minecraft/server";
import { DPUtils } from "./dp_utils";

export class DialogueUtils {

    static dialogueCallbacks: { [key: string]: (player: Player, npc: Entity) => void } = {}

    static dialogue(player: Player, npc: Entity, scene: string) {
        npc.addTag(npc.id)
        if (player.getGameMode() === GameMode.Creative) {
            player.setGameMode(GameMode.Survival)
            DPUtils.store().npc_initiator.set(npc, player.id)
            player.runCommand(`dialogue open @e[tag="${npc.id}"] @s ${scene}`)
            player.setGameMode(GameMode.Creative)
        }
        else {
            player.runCommand(`dialogue open @e[tag="${npc.id}"] @s ${scene}`)
        }
    }

    static register(eventId: string, callback: (player: Player, npc: Entity) => void) {
        this.dialogueCallbacks[eventId] = callback
    }
}

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (!sourceEntity) return
    if (Object.keys(DialogueUtils.dialogueCallbacks).includes(id)) {
        const npc = sourceEntity as Entity
        const player = world.getEntity(DPUtils.store().npc_initiator.curr(npc)) as Player
        if (!player) return
        DialogueUtils.dialogueCallbacks[id](player, npc)
    }
})

export class ActionFormUtils {

    private MENU_DATA: { buttons: { key: string, callback: (player: Player) => void, icon?: string }[], title: string, body: string } = { buttons: [], title: "", body: "" }

    title(title: string) {
        this.MENU_DATA.title = title
        return this
    }

    body(body: string) {
        this.MENU_DATA.body = body
        return this
    }

    button(key: string, callback: (player: Player) => void, icon?: string) {
        this.MENU_DATA.buttons.push({ key, callback, icon })
        return this
    }

    show(player: Player) {
        const menu = new ActionFormData()
        menu.title(this.MENU_DATA.title)
        if (this.MENU_DATA.body) {
            menu.body(this.MENU_DATA.body)
        }
        const menuData = {...this.MENU_DATA}
        menuData.buttons.forEach((button: any) => menu.button(button.key, button.icon))
        menu.show(player).then(({ selection }) => {
            if (selection === undefined) return
            menuData.buttons[selection].callback(player)
        })
        this.MENU_DATA = { buttons: [], title: "", body: "" }
    }
}