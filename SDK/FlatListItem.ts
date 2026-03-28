import { IListItemTemplate } from "./controls/IListItemTemplate";
import { UIList } from "./controls/UIList";
import { UITemplateView } from "./controls/UITemplateView";
import { Misc } from "./Misc";
import { PageShell } from "./PageShell";


export class FlatListItem implements IListItemTemplate
{
    public value: any | object;
    public itemName: string;
    public sh: PageShell;
    public tag: any | object;

    constructor(vm: any)
    {
        this.value = vm;
    }

    public itemElement: HTMLElement;
    private fn_handlers: Function[] = [];


    /**
     *
     * @param fn_handler Provide an callback function to handling UITemplateView after loads. Ex.:
     * ```
     * handle((template: UITemplateView) => {
     *   //     const btnExample: HTMLButtonElement = template.elementById('btnExample');
     *   //     btnExample.click(() => {   } );
     * })
     * ```
     * @returns
     */
    public handle(fn_handler: Function): FlatListItem
    {
        this.fn_handlers.push(fn_handler);
        return this;
    }


    fn_getItemTemplate: Function = null;
    /**
     *
     * @param fn_handler
     * ```
     * (item: FlatListItem) => {
     *    const templ = new UITemplateView('', item.sh, item.value);
     *    // .....
     *    return templ
     * }
     * ```
     * @returns
     */
    public onItemTemplate(fn_handler: Function): FlatListItem
    {

        this.fn_getItemTemplate = fn_handler;
        return this;
    }

    private fn_onDestroy: Function;
    public onDestroy(fn_destroy: Function): FlatListItem
    {
        this.fn_onDestroy = fn_destroy;
        return this;
    }

    /**  define o callback para isSelected()  */
    public onCheckSelected(fn: Function): FlatListItem
    {
        this.fn_isSelected = fn;
        return this;
    }
    private fn_isSelected: Function;

    /**  define o callback para select()*/
    public onSelect(fn: Function): FlatListItem
    {
        this.fn_select = fn;
        return this;
    }
    private fn_select: Function;
    /**  define o callback para unSelect()*/
    public onUnSelect(fn: Function): FlatListItem
    {
        this.fn_unSelect = fn;
        return this;
    }
    private fn_unSelect: Function;
    private html_template: string = '';
    /**  define o um trecho html para ser usado pela funcão itemTemplate()*/
    public withHTML(htmlString: string): FlatListItem
    {
        this.html_template = htmlString;
        return this;
    }

    /**  define o um trecho html para ser usado pela funcão itemTemplate()*/
    public template(htmlString: string): FlatListItem
    {
        this.html_template = htmlString;
        return this;
    }

    public containsCssClass(className: string): boolean
    {
        return this.itemElement.classList.contains(className);
    }

    public addCssClass(className: string)
    {
        this.itemElement.classList.add(className);
    }

    public removeCssClass(className: string)
    {
        this.itemElement.classList.remove(className);
    }

    setOwnerList(listView: UIList): void
    {
        this.sh = listView.getPageShell();
    }
    isSelected(): boolean
    {
        if (Misc.isNull(this.fn_isSelected)) return false;
        return this.fn_isSelected(this);
    }
    select(): void
    {
        if (Misc.isNull(this.fn_isSelected)) return;
        this.fn_select(this);
    }
    unSelect(): void
    {
        if (Misc.isNull(this.fn_isSelected)) return;
        this.fn_unSelect(this);
    }
    public templateView: UITemplateView;

    itemTemplate(): HTMLElement
    {
        if (Misc.isNullOrEmpty(this.html_template))
        {
            let element: HTMLElement = null;
            const templ = this.fn_getItemTemplate(this);

            if (templ instanceof UITemplateView)
            {
                this.templateView = templ;
                element = templ.templateDOM.body.firstElementChild as HTMLElement;
                if (Misc.isNull(element)) throw new Error('Invalid FlatListItem template.');
                this.itemElement = element;

                for (var i = 0; i < this.fn_handlers.length; i++)
                    this.fn_handlers[i](templ);

            }
            if (templ instanceof HTMLElement)
            {
                this.itemElement = templ;
                element = templ;
            }
            return element;
        }

        else
        {
            const templ = new UITemplateView(this.html_template, this.sh, this.value);
            this.templateView = templ;
            const element = templ.templateDOM.body.firstElementChild as HTMLElement;
            if (Misc.isNull(element)) throw new Error('Invalid FlatListItem template.');
            this.itemElement = element;

            for (var i = 0; i < this.fn_handlers.length; i++)
                this.fn_handlers[i](templ);

            return element;
        }
    }

    destroy(): void
    {
        if (!Misc.isNull(this.fn_onDestroy))
            this.fn_onDestroy(this);

        this.fn_handlers = null;
        this.fn_getItemTemplate = null;
        this.fn_isSelected = null;
        this.fn_unSelect = null;
        this.fn_select = null;
        this.html_template = null;

        this.itemElement.remove();

        if (!Misc.isNull(this.templateView))
            this.templateView.dispose();
    }

}
