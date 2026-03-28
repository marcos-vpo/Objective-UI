import { INotifiable } from "../INotifiable";
import { UIPage } from "../UIPage";
import { Widget } from "../Widget";
import { WidgetContext } from "../WidgetContext";

export class UIToast extends Widget
{
    title: string;
    text: string;
    position: string;

    private constructor(name: string, title: string, text: string, position: string)
    {
        super(name);
        this.title = title;
        this.text = text;
        this.position = position;
    }

    toastDiv: HTMLDivElement;

    private static infoIcon: string;
    private static successIcon: string;
    private static errorIcon: string;
    private static warningIcon: string;

    public static configureIcons({ info, success, error, warning }: { info: string; success: string; error: string; warning: string; })
    {
        UIToast.infoIcon = info;
        UIToast.successIcon = success;
        UIToast.errorIcon = error;
        UIToast.warningIcon = warning;
    }

    protected htmlTemplate(): string
    {
        var iconSrc = () =>
        {
            switch (this.widgetName)
            {
                case 'toast-info': return UIToast.infoIcon
                case 'toast-success': return UIToast.successIcon;
                case 'toast-error': return UIToast.errorIcon;
                case 'toast-warning': return UIToast.warningIcon;
                default: return ''
            }
        }

        return `
        <div class="d-flex justify-content-${this.position} ms-4 me-4">
            <style>
                .toast-info{
                    background: rgb(226, 248, 255);
                    border: solid 1px rgb(24, 167, 202);
                }
                .toast-success{
                    background: rgb(221, 255, 221);
                    border: solid 1px rgb(0, 94, 0);
                }
                .toast-error{
                    background: rgba(255, 208, 208, 1);
                    border: solid 1px rgb(255, 79, 79);
                }
                .toast-warning {
                    background: rgb(255, 249, 219);
                    border: solid 1px rgb(255, 200, 0);
                }
                .dv-toast {
                    opacity: 0;
                    position: absolute;
                    min-width: 120px;
                    max-width: 500px;
                    min-height: 80px;
                    margin-top: 10px;
                    z-index: 10;
                    border-radius: 8px;
         
                }
            </style>
            <div id="toast-div" class="dv-toast ${this.widgetName} ps-2 pe-2 shadow-lg d-flex justify-content-center align-items-center text-center">
                <img src="${iconSrc()}" style="width: 50px; height:50px; padding:8px"/>
                <div class="d-flex flex-column justify-content-start align-items-start text-start">
                    <label id="lblTitle" class="fw-bold text-black"> ${this.title} </label>
                    <label id="lblText" class="text-black"> ${this.text} </label>
                </div>
            </div>
        </div>
    `
    }

    protected onWidgetDidLoad(): void
    {
        this.toastDiv = this.elementById('toast-div')
        const $ = this;
        this.toastDiv.onclick = () => $.toastDiv.remove()
    }

    public static success(title: string, text: string, targetDivId: string, position: string)
    {
        const toast = new UIToast('toast-success', title, text, position)
        UIToast.show(targetDivId, toast);
    }

    public static info(title: string, text: string, targetDivId: string, position: string)
    {
        const toast = new UIToast('toast-info', title, text, position)
        UIToast.show(targetDivId, toast);
    }

    public static warning(title: string, text: string, targetDivId: string, position: string)
    {
        const toast = new UIToast('toast-warning', title, text, position)
        UIToast.show(targetDivId, toast);
    }

    public static error(title: string, text: string, targetDivId: string, position: string)
    {
        const toast = new UIToast('toast-error', title, text, position)
        UIToast.show(targetDivId, toast);
    }

    private static show(targetDivId: string, toast: UIToast)
    {
        const ctx = new WidgetContext(UIPage.shell, [targetDivId]);
        ctx.addWidget(targetDivId, toast);
        ctx.build(new class noty implements INotifiable
        {
            onNotified(sender: any, args: any[]): void
            {
                var is = setInterval(() =>
                {
                    if (toast.toastDiv.style.opacity == '')
                        toast.toastDiv.style.opacity = '0'

                    if (parseFloat(toast.toastDiv.style.opacity) < 1.0)
                    {
                        toast.toastDiv.style.opacity = `${parseFloat(toast.toastDiv.style.opacity) + 0.08}`;
                    }

                    else
                    {
                        clearInterval(is);
                        var t = setTimeout(() =>
                        {

                            var it = setInterval(() =>
                            {
                                if (parseFloat(toast.toastDiv.style.opacity) > 0)
                                {
                                    toast.toastDiv.style.opacity = `${parseFloat(toast.toastDiv.style.opacity) - 0.02}`;
                                }
                                else
                                {
                                    toast.toastDiv.remove();
                                    ctx.clear();
                                    clearInterval(it);
                                }
                            }, 50);

                            clearTimeout(t);
                        }, 1500);
                    }

                }, 50);
            }
        });
    }
}