import { Widget } from "../Widget";
import { IBindable } from "../IBindable";
import { ICustomWidgetPresenter } from "../ICustomWidgetPresenter";
import { WidgetBinder } from "../WidgetBinder";
import { DataGridItem } from "./DataGridItem";
import { IDataGridItemTemplate } from "./IDataGridItemTemplate";
import { IDataGridItemTemplateProvider } from "./IDataGridItemTemplateProvider";
import { Misc } from "../Misc";
import { DefaultExceptionPage } from "../DefaultExceptionPage";
import { FlatListItem } from "../FlatListItem";
import { FlatList } from "../FlatList";
import { FlatDataGrid, FlatDataGridItem } from "../FlatDataGrid";
import { UIList } from "./UIList";

export class DataGridColumnDefinition
{
    /**Column Header */
    public h: string;

    /**Model key (property) name */
    public k: string;
}

export class UIDataGridBinder extends WidgetBinder
{
    private dataGrid: UIDataGrid;
    constructor(dataGrid: UIDataGrid)
    {
        super(dataGrid);
        this.dataGrid = dataGrid;
    }

    getWidgetValue()
    {
        return this.dataGrid.selectedValue();
    }
    refreshUI(): void
    {
        var viewModels: Array<any | object> = this.getModelPropertyValue();
        this.dataGrid.fromList(viewModels);

        if (this.isTargetDefined())
        {
            var value = this.getModelTargetPropertyValue();
            this.dataGrid.setSelectedValue(value);
        }
    }
    fillPropertyModel(): void
    {
        if (this.isTargetDefined())
        {
            this.fillModelTargetPropertyValue();
        }
    }
}

export class UIDataGrid extends Widget implements IBindable
{
    public autoGenerateColumns: boolean;
    public table: HTMLTableElement;
    public tableHeader: HTMLTableSectionElement;
    public tableBody: HTMLTableSectionElement;
    public selectedBackColor: string = '#007BFF';
    public unselectedBackColor: string = '#FFFFFF';

    public selectedForeColor: string = '#FFFFFF'
    public unselectedForeColor: string = '#000000'

    private templateProvider: IDataGridItemTemplateProvider;
    public items: Array<IDataGridItemTemplate> = [];

    public MODEL_KEYS: Array<string> = [];



    private tableCssClasses: string = 'table table-hover table-bordered table-sm';
    private columnsCsv: string;
    private customTemplateFunction: Function | ((item: FlatDataGridItem) => void)
    constructor({ name, autoGenCols = false, columnsCsv = null, cssClasses = null, customTemplateFunction = null }: {
        name: string,
        autoGenCols?: boolean,
        columnsCsv?: string,
        itemTemplateProvider?: IDataGridItemTemplateProvider,
        baseTemplate?: string,
        cssClasses?: string,
        customTemplateFunction?: string | ((item: FlatDataGridItem) => void)
    })
    {
        super(name);
        this.autoGenerateColumns = autoGenCols;
        if (!Misc.isNullOrEmpty(cssClasses))
            this.tableCssClasses = cssClasses;

        this.columnsCsv = columnsCsv;

        if (Misc.isNullOrEmpty(customTemplateFunction) == false)
        {
            if (typeof customTemplateFunction === 'string')
            {
                this.customTemplateFunction = new Function('item', customTemplateFunction);
            }
            else
                this.customTemplateFunction = customTemplateFunction as Function;
        }
    }


    protected htmlTemplate(): string
    {
        return `
<table id="fsDataGrid" class="${this.tableCssClasses}">
  <thead id="gridHeader">
  </thead>
  <tbody id="gridBody" style="overflow-y:scroll;">
  </tbody>
</table>        
`;
    }

    protected onWidgetDidLoad(): void
    {
        this.table = this.elementById('fsDataGrid');
        this.table.style.background = 'white';
        this.tableHeader = this.elementById('gridHeader');
        this.tableBody = this.elementById('gridBody');

        if (this.autoGenerateColumns == false)
        {
            if (Misc.isNullOrEmpty(this.columnsCsv))
                return
            const cdf: DataGridColumnDefinition[] = []
            const csv = this.columnsCsv.split(',');
            for (let i = 0; i < csv.length; i++)
            {
                const c = csv[i].split(':');
                cdf.push({ h: c[0], k: c[1] });
            }
            this.addColumns(cdf);
        }

        if (Misc.isNull(this.customTemplateFunction) == false)
        {
            this.setTemplateProvider(new FlatDataGrid((item: FlatDataGridItem) =>
            {
                this.customTemplateFunction(item);
            }));
        }
    }


    getBinder(): WidgetBinder
    {
        return new UIDataGridBinder(this);
    }

    /**
     * 
     * @param colDefs array of { h: 'Column Header', k: 'model_property_name' }
     */
    public addColumns(colDefs: Array<DataGridColumnDefinition>): void
    {
        this.table.tHead.innerHTML = '';
        for (var i = 0; i < colDefs.length; i++)
        {
            var def: DataGridColumnDefinition = colDefs[i];
            this.addColumn(def.h, def.k);
        }
    }

    public setTemplateProvider(provider: IDataGridItemTemplateProvider): UIDataGrid
    {
        this.templateProvider = provider;
        return this;
    }

    public addColumn(columnHeader: string, modelKey: string): UIDataGrid
    {
        var shell = this.getPageShell();
        this.MODEL_KEYS.push(modelKey);
        var thead = this.table.tHead;

        if (thead.childNodes.length == 0)
            thead.appendChild(shell.createElement('tr'));

        var th = shell.createElement('th', columnHeader);
        th.scope = 'col';
        thead.children[0].appendChild(th);

        return this;
    }

    private generateColumns(list: Array<any>): void
    {
        this.autoGenerateColumns = false;
        this.table.tHead.innerHTML = '';
        this.MODEL_KEYS = [];

        var shell = this.getPageShell();

        //creating columns
        var tr: HTMLTableRowElement = shell.createElement('tr');
        let firstModel = list[0];
        for (let key in firstModel)
        {
            var th = shell.createElement('th');
            th.scope = 'col';
            th.textContent = key;
            tr.appendChild(th);
            this.MODEL_KEYS.push(key);
        }
        this.table.tHead.appendChild(tr);
    }

    public fromList(list: Array<any>): void
    {
        this.table.tBodies[0].innerHTML = '';
        this.items = [];

        if ((list == null || list == undefined) || list.length == 0)
            return;

        var shell = this.getPageShell();
        if (this.autoGenerateColumns)
            this.generateColumns(list);

        //adding rows
        for (var i = 0; i < list.length; i++)
        {
            var model = list[i];

            var itemTemplate: IDataGridItemTemplate;
            if (this.templateProvider == null)
                itemTemplate = new DataGridItem(`default_datagrid_item_${i + 1}`, model, shell);
            else
                itemTemplate = this.templateProvider.getDataGridItemTemplate(this, model);

            itemTemplate.setOwnerDataGrid(this);
            this.items.push(itemTemplate);
            this.table.tBodies[0].appendChild(itemTemplate.itemTemplate());
        }
    }

    public selectedItem(): IDataGridItemTemplate
    {
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i].isSelected())
                return this.items[i];
        return null;
    }

    public selectedValue(): any | object
    {
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i].isSelected())
                return this.items[i].value;
        return null;
    }

    public setSelectedItem(item: IDataGridItemTemplate): void
    {
        for (var i = 0; i < this.items.length; i++)
            this.items[i].unSelect();
        item.select();
    }

    public setSelectedValue(model: any | object): void
    {
        for (var i = 0; i < this.items.length; i++)
        {
            var item = this.items[i];
            if (item.value == model)
                item.select();
            else
                item.unSelect();
        }
    }

    public onRowClick(item: IDataGridItemTemplate): void
    {
        for (var i = 0; i < this.items.length; i++)
            if (this.items[i].isSelected())
                this.items[i].unSelect();

        item.select();

        if (Misc.isNull(this.fnOnRowClick) == false)
            this.fnOnRowClick(item);
    }

    private fnOnRowClick: (item: IDataGridItemTemplate) => void = null;
    public setOnItemClick(fn: (item: IDataGridItemTemplate) => void)
    {
        this.fnOnRowClick = fn;
    }

    public value(): string
    {
        return this.selectedValue();
    }

    public applyCSS(propertyName: string, propertyValue: string): void
    {
        this.table.style.setProperty(propertyName, propertyValue);
    }

    public setVisible(visible: boolean): void
    {
        this.table.style.visibility = (visible ? 'visible' : 'hidden')
    }

}
