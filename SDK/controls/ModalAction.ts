import { Misc } from "../Misc";
import { UIDialog } from "./UIDialog";

export class ModalAction
{
    public text: string;
    public classes: string[] = [];
    public onClick?: Function;
    public dismis: boolean;
    icon: string;
    iconWidth: string;
    iconHeight: string;
    iconRight: boolean;

    constructor({ buttonText, dataDismiss = false, buttonClasses = 'btn btn-light', icon = null, iconRight = false, iconWidth = null, iconHeight = null, buttonClick = null }:
        {
            buttonText: string;
            dataDismiss?: boolean;
            buttonClick?: Function;
            buttonClasses?: string;
            icon?: string;
            iconRight?: boolean;
            iconWidth?: string;
            iconHeight?: string;
        })
    {
        this.text = buttonText;

        this.onClick = buttonClick;
        this.dismis = dataDismiss;
        this.icon = icon;
        this.iconWidth = iconWidth;
        this.iconHeight = iconHeight;
        this.iconRight = iconRight;

        const classesStr = buttonClasses.split(' ');
        for (var c = 0; c < classesStr.length; c++)
            this.classes.push(classesStr[c]);

        if (this.text == null)
            this.text = 'Modal action';
        if (this.classes == null || this.classes.length == 0)
            this.classes = ['btn', 'btn-primary'];
    }

    public setButton(button: HTMLButtonElement, modal: UIDialog)
    {
        var self = this;
        if (Misc.isNull(this.onClick) == false)
            button.onclick = function ()
            {
                self.onClick(modal);
            };
    }
}