import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

export class MenuUtils {

    static MENU_DATA: any = { buttons: [], title: "" }

    static title(title: string) {
        this.MENU_DATA.title = title
        return MenuUtils
    }

    static button(key: string, callback: () => void) {
        this.MENU_DATA.buttons.push({ key, callback })
        return MenuUtils
    }

    static show(player: Player) {
        const menu = new ActionFormData()
        menu.title(this.MENU_DATA.title)
        this.MENU_DATA.buttons.forEach((button: any) => {
            menu.button(button.key)
        })
        menu.show(player).then(({ selection }) => {
            if (selection === undefined) return
            this.MENU_DATA.buttons[selection].callback()
        })
        this.MENU_DATA = { buttons: [], title: "" }
    }
}