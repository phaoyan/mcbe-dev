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

/**
 * 菜单按钮动作类型
 */
export type MenuAction =
    | { type: 'submenu', menu: MenuDefinition }  // 跳转到子菜单
    | { type: 'detail', content: string, displayButton?: { label: string, icon?: string } }  // 显示详情页
    | { type: 'callback', callback: (player: Player) => void }  // 自定义回调

/**
 * 菜单按钮定义
 */
export interface MenuButton {
    label: string;
    icon?: string;
    action: MenuAction;
}

/**
 * 菜单定义
 */
export interface MenuDefinition {
    title: string;
    body?: string;
    buttons: MenuButton[];
    returnTo?: MenuDefinition;  // 返回到的父菜单
}

/**
 * 菜单工具类
 * 提供数据驱动的菜单构建功能
 */
export class MenuUtils {
    /**
     * 显示菜单
     * @param player 玩家
     * @param menuDef 菜单定义
     */
    static showMenu(player: Player, menuDef: MenuDefinition) {
        const menu = new ActionFormUtils();
        menu.title(menuDef.title);

        if (menuDef.body) {
            menu.body(menuDef.body);
        }

        // 添加所有按钮
        menuDef.buttons.forEach(button => {
            const callback = (p: Player) => {
                switch (button.action.type) {
                    case 'submenu':
                        // 设置子菜单的返回路径
                        button.action.menu.returnTo = menuDef;
                        MenuUtils.showMenu(p, button.action.menu);
                        break;
                    case 'detail':
                        MenuUtils.showDetailMenu(p, button.action.content, menuDef, button.action.displayButton);
                        break;
                    case 'callback':
                        button.action.callback(p);
                        break;
                }
            };
            menu.button(button.label, callback, button.icon);
        });

        // 如果有父菜单，自动添加返回按钮
        if (menuDef.returnTo) {
            menu.button("Return", (p) => MenuUtils.showMenu(p, menuDef.returnTo!));
        }

        menu.show(player);
    }

    /**
     * 显示详情菜单
     * @param player 玩家
     * @param content 详情内容
     * @param returnTo 返回到的菜单
     * @param displayButton 装饰性按钮（可选）
     */
    static showDetailMenu(
        player: Player,
        content: string,
        returnTo: MenuDefinition,
        displayButton?: { label: string, icon?: string }
    ) {
        const menu = new ActionFormUtils();
        menu.title("Detail");
        menu.body(content);

        // 如果有装饰性按钮，添加它（点击无操作）
        if (displayButton) {
            menu.button(displayButton.label, () => { }, displayButton.icon);
        }

        // 返回按钮
        menu.button("Return", () => MenuUtils.showMenu(player, returnTo));
        menu.show(player);
    }
}