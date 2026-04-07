import { Widget } from "../Widget";
import { WidgetContext } from "../WidgetContext";
import { ICustomWidgetPresenter } from "../ICustomWidgetPresenter";
import { VirtualFunction } from "../VirtualFunction";
import { PageShell } from "../PageShell";
import { UITemplateView } from "./UITemplateView";
import { ModalAction } from "./ModalAction";
import { INotifiable } from "../INotifiable";
import { Misc } from "../Misc";
import { UIPage } from "../UIPage";
import { DefaultExceptionPage } from "../DefaultExceptionPage";

export class UIDialog extends Widget implements INotifiable
{
    public static $: UIDialog;

    private showFunction: VirtualFunction;

    public contentTemplate: UITemplateView;
    private modalTopActions: ModalAction[] = [];
    private modalActions: ModalAction[] = [];
    private titleText: string;

    private sizeableContainer:HTMLDivElement
    public modalContainer: HTMLDivElement;
    public titleElement: HTMLHeadElement;
    public modalTopActionsContainer: HTMLDivElement;
    public bodyContainer: HTMLDivElement;
    public footerContainer: HTMLDivElement;
    public btnClose: HTMLButtonElement;
    public modalContent: HTMLDivElement;

    private shell: PageShell;

    private modalContext: WidgetContext;

    private height: string = null;

    private customTemplate: string = null;
    onCloseFn: Function;
    modalClass: string;
    constructor(shell: PageShell, customTempl?: string, height?: string, modalClass?: string)
    {
        super('UIDialog');

        this.shell = shell;
        this.height = height;
        this.modalClass = modalClass;
        if (!Misc.isNullOrEmpty(customTempl))
            this.customTemplate = customTempl;
        else
        {
            if (PageShell.BOOTSTRAP_VERSION_NUMBER >= 5)
                throw new DefaultExceptionPage(new Error(`UIDialog: this widget does not supports Bootstrap v${PageShell.BOOTSTRAP_VERSION}. Use 'UIDialogBS5' class instead it.`))
        }

        // obtem o body da pagina
        var body: Element = shell.getPageBody();

        // verifica se existe a div que vai conter o modal
        var modalDivContainer: Element = shell.elementById('modalContainer');
        if (modalDivContainer == null)
        {
            // nao existe, então deve ser criada uma div-container 
            // para controlar o modal
            modalDivContainer = shell.createElement('div');
            modalDivContainer.id = 'modalContainer';
            body.appendChild(modalDivContainer);
        }

        // é criado um WidgetContext para gerenciar a div
        // container do modal
        this.modalContext = new WidgetContext(
            shell,
            [modalDivContainer.id],
            null);
    }

    public closeDialog()
    {
        const x = new VirtualFunction({
            fnName: 'closeModal',
            fnArgNames: ['container'],
            fnContent: `
                var modalEl = container; //document.getElementById(containerId);
                var modalInstance = bootstrap.Modal.getInstance(modalEl);
                modalInstance.hide();
            `
        }).call(this.modalContainer);

        try
        {
            this.modalContainer.remove();
        } catch (e)
        {

        }
        UIDialog.$ = null;
    }

    public actionTop(modalTopAction: ModalAction): UIDialog
    {
        this.modalTopActions.push(modalTopAction);
        return this;
    }

    public action(action: ModalAction): UIDialog
    {
        this.modalActions.push(action);
        return this;
    }

    public setTitle(dialogTitle: string): UIDialog
    {
        this.titleText = dialogTitle;
        return this;
    }

    public modalBody(templateView: UITemplateView): UIDialog
    {
        this.contentTemplate = templateView;
        return this;
    }

    public setText(dialogText: string): UIDialog
    {
        this.contentTemplate = new UITemplateView(dialogText, this.shell);
        return this;
    }

    public useTemplate(templateView: UITemplateView): UIDialog
    {
        this.contentTemplate = templateView;
        return this;
    }

    private dataDismissAttrName: string = 'data-dismiss'
    public setDataDismisAttributeName(attrName: string)
    {
        this.dataDismissAttrName = attrName;
    }

    protected htmlTemplate(): string
    {
        if (!Misc.isNullOrEmpty(this.customTemplate))
        {
            if (this.customTemplate.indexOf('UIModalView') == -1)
                throw new Error(`UIDialog '${this.widgetName}' failed to load: custom base-template does not contains an <div/> with Id="UIModalView".`)
            if (this.customTemplate.indexOf('modalTitle') == -1)
                throw new Error(`UIDialog '${this.widgetName}' failed to load: custom base-template does not contains an Element with Id="modalTitle".`)
            if (this.customTemplate.indexOf('modalBody') == -1)
                throw new Error(`UIDialog '${this.widgetName}' failed to load: custom base-template does not contains an <div/> with Id="modalBody".`)
            if (this.customTemplate.indexOf('modalFooter') == -1)
                throw new Error(`UIDialog '${this.widgetName}' failed to load: custom base-template does not contains an <div/> with Id="modalFooter".`)

            return this.customTemplate;
        }
        var styleHeight: string = '';
        if (!Misc.isNullOrEmpty(this.height))
            styleHeight = `style="height:${this.height}"`
        return `
 <div id="UIModalView" class="modal fade ${this.modalClass}" role="dialog">
    <div class="modal-dialog" role="document">        
        <div id="modalContent" class="modal-content shadow-lg" ${styleHeight}>
            <div class="modal-header">
                <h5 id="modalTitle" class="modal-title flex-fill">Modal title</h5>
                <div id="customTopActions" class="d-flex flex-row justify-content-end">
          
                </div>
                <button id="btnClose" type="button" class="close" ${this.dataDismissAttrName}="modal" aria-label="Close">
                    <span aria-hidden="true">&#128470;</span>
                </button>
            </div>
            
            <div id="modalBody" class="modal-body pt-1" style="background:white">
                
            </div>

            <div id="modalFooter" class="modal-footer">
        
            </div>
        </div>
    </div>
  </div>`;

    }

    private sizeOptions: string[] = ['modal-sm', 'modal-md', 'modal-lg', 'modal-xl', 'modal-fullscreen'];
    public resize(modalClass: string)
    {
       this.sizeableContainer.classList.remove(...this.sizeOptions)
       this.sizeableContainer.classList.add(modalClass)
    }

    /**
     * Set the height of the modal content.
     * @param height - the desired height of the modal content.
     * @returns - this UIDialog instance.
     */
    public setHeight(height: string): UIDialog
    {
        this.height = height
        if (!Misc.isNull(this.modalContent))
            this.modalContent.style.height = height;
        return this;
    }

    protected onWidgetDidLoad(): void
    {
        var self = this;

        self.sizeableContainer = self.elementById(parseFloat(PageShell.BOOTSTRAP_VERSION) > 5 ? 'modalContainerChild' : 'UIModalView')
        self.modalContainer = self.elementById('UIModalView');
        self.modalContent = self.elementById('modalContent')
        self.titleElement = self.elementById('modalTitle');
        self.modalTopActions = self.elementById('customTopActions');
        self.bodyContainer = self.elementById('modalBody');
        self.footerContainer = self.elementById('modalFooter');
        self.btnClose = self.elementById('btnClose');
        self.titleElement.textContent = self.titleText;

        if (!Misc.isNullOrEmpty(self.contentTemplate))
            self.bodyContainer.appendChild(self.contentTemplate.content());

        for (var i = 0; i < self.modalTopActions.length; i++)
        {
            const action: ModalAction = self.modalTopActions[i];
            const btn: HTMLButtonElement = self.shell.createElement('button');
            btn.type = 'button';
            btn.id = `modalAction_${Misc.generateUUID()}`;

            if (Misc.isNullOrEmpty(action.icon))
                btn.textContent = action.text;
            else
            {
                const img = self.shell.createElement('img')
                img.src = action.icon;
                img.style.width = action.iconWidth
                img.style.height = action.iconHeight

                const spnText = self.shell.createElement('span')
                spnText.textContent = action.text

                if (action.iconRight)
                {
                    btn.appendChild(spnText);
                    btn.appendChild(img);
                }
                else
                {
                    btn.appendChild(img);
                    btn.appendChild(spnText);
                }
            }

            for (var c = 0; c < action.classes.length; c++)
                btn.classList.add(action.classes[c]);

            action.setButton(btn, this);
            if (action.dismis)
                btn.setAttribute(`${this.dataDismissAttrName}`, 'modal');

            self.modalTopActionsContainer.appendChild(btn);
        }

        for (var i = 0; i < self.modalActions.length; i++)
        {
            const action: ModalAction = self.modalActions[i];
            const btn: HTMLButtonElement = self.shell.createElement('button');
            btn.type = 'button';
            btn.id = `modalAction_${Misc.generateUUID()}`;

            if (Misc.isNullOrEmpty(action.icon))
                btn.textContent = action.text;
            else
            {
                const img = self.shell.createElement('img')
                img.src = action.icon;
                img.style.width = action.iconWidth
                img.style.height = action.iconHeight

                const spnText = self.shell.createElement('span')
                spnText.textContent = action.text

                if (action.iconRight)
                {
                    btn.appendChild(spnText);
                    btn.appendChild(img);
                }
                else
                {
                    btn.appendChild(img);
                    btn.appendChild(spnText);
                }
            }

            for (var c = 0; c < action.classes.length; c++)
                btn.classList.add(action.classes[c]);

            action.setButton(btn, this);
            if (action.dismis)
                btn.setAttribute(`${this.dataDismissAttrName}`, 'modal');

            self.footerContainer.appendChild(btn);
        }

        self.showFunction = new VirtualFunction({
            fnName: 'modalShow',
            fnArgNames: [
                'containerId',
                'showFunctionId'
            ],
            keepAfterCalled: true
        })
        self.showFunction.setContent(`
            var md = new bootstrap.Modal(document.getElementById(containerId), { backdrop: false })
            md.show();
            var refId = ('#' + containerId)
            $(refId).on('hidden.bs.modal', function (e) {
                document.getElementById(containerId).remove();
                document.getElementById(showFunctionId).remove();
            })
        `).call(self.modalContainer.id, self.showFunction.functionId);
    }

    private onComplete: Function = null;
    public show(onComplete?: Function): void
    {
        this.onComplete = onComplete;
        this.modalContext.addWidget('modalContainer', this);
        this.modalContext.build(this);
        UIDialog.$ = this;
    }

    public setOnCloseFn(onClose: Function): UIDialog
    {
        this.onCloseFn = onClose;
        this.btnClose.onclick = () => onClose
        return this
    }

    onNotified(sender: any, args: Array<any>): void
    {
        if (Misc.isNull(this.onComplete) == false)
            this.onComplete(this);
    }
}