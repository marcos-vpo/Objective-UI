import { FlatListItem } from "./FlatListItem";
import { Misc } from "./Misc";
import { IListItemTemplate } from "./controls/IListItemTemplate";
import { IListItemTemplateProvider } from "./controls/IListItemTemplateProvider";
import { UIList } from "./controls/UIList";

export class FlatList implements IListItemTemplateProvider
{
    private callFn: Function;
    constructor(fn: Function)
    {
        this.callFn = fn
    }
    getListItemTemplate(sender: UIList, viewModel: any): IListItemTemplate
    {
        if (Misc.isNull(viewModel)) return
        const item = new FlatListItem(viewModel)
        this.callFn(item)
        return item
    }

}

