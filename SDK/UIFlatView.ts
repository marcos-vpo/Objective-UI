import { BindingContext } from "./BindingContext";
import { Misc } from "./Misc";
import { PageShell } from "./PageShell";
import { ViewBuilder } from "./ViewBuilder";
import { ViewCache } from "./UIFlatViewCache";
import { UIPage } from "./UIPage";
import { UIView } from "./UIView";
import { ViewLayout } from "./ViewLayout";
import { WidgetBinderBehavior } from "./WidgetBinderBehavior";
import { DivContent } from "./yord-api/DivContent";
import { DefaultExceptionPage } from "./DefaultExceptionPage";
import { ViewDictionaryEntry } from "./ViewDictionaryEntry";
import { WidgetContext } from "./WidgetContext";
import { LanguageServer } from "./i18n/LanguageServer";

/**
 * UIFlatView represents an evolution of the base UIView, designed for 
 * decoupled architecture and high-performance UI management.
 * * Key enhancements over standard UIView:
 * 1. External Layout Loading: Separates logic from design by loading HTML resources.
 * 2. ID Dictionary Mapping: Automatically generates unique UUIDs for DOM elements, 
 * preventing ID collisions and allowing multiple concurrent instances of the same View.
 * 3. Integrated Data Binding: Native support for BindingContext, enabling 
 * automatic UI synchronization with ViewModel states.
 * 4. Static View Caching: Optimized lifecycle that caches parsed layouts to 
 * minimize network overhead and speed up transitions.
 * 5. Native i18n: Built-in hooks for the LanguageServer to automate widget translation.
 */
export abstract class UIFlatView extends UIView
{
    /**
     * Static cache to store loaded HTML layouts and avoid redundant network/disk requests.
     */
    private static caches: ViewCache[] = [];

    /**
     * Local dictionary that maps original HTML IDs to uniquely generated IDs for this specific instance.
     */
    private viewDictionary: ViewDictionaryEntry[] = [];

    /**
     * Searches the static cache for a previously loaded layout by its path.
     * @param path The resource path of the layout.
     */
    private static findCached(path: string)
    {
        for (var c = 0; c < this.caches.length; c++)
        {
            const cached = this.caches[c];
            if (cached.path == path) return cached;
        }
        return null;
    }

    /**
     * Loads the view layout and prepares the instance for rendering. 
     * Handles caching logic and ID dictionary generation if enabled.
     * @param view The UIFlatView instance to be loaded.
     */
    public static load(view: UIFlatView)
    {
        try
        {
            view.builder = view.buildView();
            view.builder.layoutPath = view.builder.layoutPath.trim();
        } catch (e: Error | any)
        {
            throw new DefaultExceptionPage(new Error(`${view.constructor.name}.buildView(): Failed to build view: ${e?.message}`));
        }
        
        const isRawHtml = view.builder.layoutPath.startsWith('<') 
        const cached = isRawHtml ? null : (view.builder.dictionaryEnabled ? null : this.findCached(view.builder.layoutPath));
        if (!Misc.isNull(cached))
        {
            view.builder.layoutHtml = cached.content;
            UIPage.shell.navigateToView(view, view.builder.preventClear)
        }
        else
            ViewLayout.load(view.builder.layoutPath, function (html: string)
            {
                if (Misc.isNullOrEmpty(html) || html.indexOf('<title>Error</title>') > -1)
                    throw new DefaultExceptionPage(new Error(`No html-layout found for '${view.builder.layoutPath}'`))

                if (view.builder.dictionaryEnabled)
                {
                    var parser = new DOMParser();
                    var domObj = parser.parseFromString(html, "text/html");
                    var allIds = domObj.querySelectorAll('*[id]');

                    for (var i = 0; i < allIds.length; i++)
                    {
                        var element = allIds[i];
                        var currentId = element.getAttribute('id');
                        if (currentId != null)
                        {
                            var newId = `${currentId}_${Misc.generateUUID()}`;
                            view.addDictionaryEntry(currentId, newId);
                            element.setAttribute('id', newId);
                        }
                    }

                    html = domObj.getElementsByTagName('body')[0].innerHTML;
                }

                view.builder.layoutHtml = html;
                UIPage.shell.navigateToView(view, view.builder.preventClear)

                if (!view.builder.dictionaryEnabled)
                    if (!isRawHtml)
                        UIFlatView.caches.push(new ViewCache(view.builder.layoutPath, html))
            });
    }

    protected onUnLoad(): void { }

    public override onViewDidUnLoad(): void
    {
        try
        {
            this.onUnLoad()
        } catch { }
    }

    /**
     * Allows 2+ instances of same UIFlatView 
     * Adds an entry to the ID dictionary to map a static ID to a unique instance-specific ID.
     * @param originalId The Id of the element present in the HTML resource
     * @param generatedId The self-generated Id value
    */
    private addDictionaryEntry(originalId: string, generatedId: string)
    {
        var entry = new ViewDictionaryEntry(originalId, generatedId);
        this.viewDictionary.push(entry);
    }

    /**
     * Retrieves a physical element 'Id' registered in dictionary
     * @param originalId original element Id declared in html-layout
     * @returns fisical random element Id registered in dictionary
     */
    public dict(originalId: string): string
    {
        for (var i = 0; i < this.viewDictionary.length; i++)
        {
            const entry = this.viewDictionary[i];
            if (entry.originalId == originalId)
                return entry.managedId
        }
    }

    /**
     * Retrieves a physical element (HTMLElement-object) registered in dictionary
     * @param originalId original element Id declared in html-layout
     * @returns physical DOM element registered in dictionary
     */
    public dictElement<TElement>(originalId: string): TElement
    {
        for (var i = 0; i < this.viewDictionary.length; i++)
        {
            const entry = this.viewDictionary[i];
            if (entry.originalId == originalId)
                return document.getElementById(entry.managedId) as TElement
        }
    }

    private builder: ViewBuilder;
    private binding: BindingContext<any | object>;

    public isDataBindingEnabled()
    {
        return Misc.isNull(this.binding) == false
    }

    /**
     * Must be implemented to return a ViewBuilder that configures the layout path, 
     * target container, and widget content for this view.
     */
    protected abstract buildView(): ViewBuilder;

    /**
     * Builds the ViewLayout based on the builder configuration.
     */
    buildLayout(): ViewLayout
    {
        return new ViewLayout(this.builder.targetId).fromHTML(this.builder.layoutHtml)
    }

    /**
     * Connects widgets to their respective layout containers. 
     * Automatically handles ID mapping if dictionary mode is enabled.
     */
    composeView(): void
    {
        for (var c = 0; c < this.builder.viewContent.length; c++)
        {
            var content: DivContent = this.builder.viewContent[c];

            if (this.builder.dictionaryEnabled)
                this.addWidgets(this.dict(content.id), ...content.w);
            else
                this.addWidgets(content.id, ...content.w);
        }
    }

    /**
     * Finalizes view initialization. Sets up data binding, 
     * initializes internationalization (i18n), and executes custom load logic.
     */
    onViewDidLoad(): void
    {
        if (this.builder.hasBinding())
            this.binding = this.builder.getBinding(this);

        if (!Misc.isNull(this.builder.languageSrv))
        {
            try
            {
                const db = this.requestLocalStorage('i18n')
                this.translateLanguage(db.get('lang'))
            } catch { }
        }

        this.builder.callLoadFn(this.viewContext());
    }

    /**
     * Retrieves the current View Model data from the binding context.
     * @param callValidations Whether to run validation rules before returning the model.
     */
    public getViewModel<TViewModel>(callValidations: boolean = true): TViewModel
    {
        return this.binding.getViewModel<TViewModel>(callValidations);
    }

    /**
     * Updates the View Model instance and optionally refreshes the UI widgets.
     * @param instance The new model data.
     * @param updateUI If true, automatically updates widget values.
     */
    public setViewModel<TViewModel>(instance: TViewModel, updateUI: boolean = true): void
    {
        this.binding.setViewModel(instance, updateUI);
    }

    /**
     * Returns the binding behavior associated with a specific model property.
     * @param modelPropertyName The property name in the View Model.
     */
    public getBindingFor(modelPropertyName: string): WidgetBinderBehavior
    {
        return this.binding.getBindingFor(modelPropertyName);
    }

    /**
     * Returns the underlying BindingContext managing data synchronization for this view.
     */
    public getBindingContext<TViewModel>(): BindingContext<TViewModel>
    {
        return this.binding;
    }

    /**
     * Causes a UI refresh on all Widgets managed by this Data Binding Context
     * based on the current values of the properties/keys of the ViewModelType instance
     * * (remember that the ViewModelType instance is managed by this context as well)
     */
    public bindingRefreshUI(): void
    {
        return this.getBindingContext().refreshAll();
    }

    /**
     * Translates all managed widgets to the specified language using the configured LanguageServer.
     * @param langName The target language identifier (e.g., 'en', 'pt').
     */
    public translateLanguage(langName: string): void
    {
        const srv = this.builder.languageSrv

        const allWidgets = this.viewContext().getAll()
        for (var w = 0; w < allWidgets.length; w++)
        {
            const widget = allWidgets[w]
            var translation = srv.translate(widget.widgetName, langName)
            if (Misc.isNullOrEmpty(translation)) continue

            try
            {
                widget.setTitle(translation)
            } catch
            {
                try
                {
                    widget.setText(translation)
                } catch { }
            }
        }
    }
}