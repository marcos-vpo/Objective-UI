import { BindingContext } from "./BindingContext";
import { DefaultExceptionPage } from "./DefaultExceptionPage";
import { LanguageServer } from "./i18n/LanguageServer";
import { Misc } from "./Misc";
import { UIView } from "./UIView";
import { Widget, WidgetContext } from "./Widget";
import { DivContent } from "./yord-api/DivContent";

/**
 * ViewBuilder is a fluent API engine used to orchestrate the metadata and lifecycle 
 * of a UIFlatView. 
 * * It acts as a declarative bridge between raw HTML layouts and high-level UI Objects (Widgets).
 * By using the Builder pattern, it ensures that data binding, widget mapping, and 
 * initialization logic are configured in a type-safe, readable sequence.
 * * Key Responsibilities:
 * - Layout & Target definition (HTML source and DOM destination).
 * - Widget Placement (Mapping UI Objects to layout containers).
 * - Data Binding & Validation (Connecting ViewModels to Widgets).
 * - Lifecycle Management (Executing logic through the onLoad hook).
 ```
  protected buildView(): ViewBuilder {
    return ViewBuilder
        .from('/views/sales/order-form.html') // Sets the external HTML template source
        .to('main-container')                 // Defines the target DOM injection point
        .put('header-slot', new UIHead({ text: 'New Order' })) // Maps UI Objects to HTML slots
        .put('form-slot', this.txtName, this.txtEmail) // Injects multiple Widgets into a container
        .bindWith<OrderVM>(this.orderVM)      // Connects the UI to a Data Model (VM)
        .validate('email', (val) => val.includes('@')) // Adds integrity rules to the Model
        .onLoad((ctx) => {     
            // Post-initialization hook for UI Object logic               
            this.txtName.setText('John Doe'); // Safe manipulation via Object API
            this.calculateTotals();           // Executes internal view business logic
        });
  ```
}
 */
export class ViewBuilder
{
    /** The ID of the DOM element where this view will be rendered. */
    public targetId: string;
    /** The path to the external HTML layout file. */
    public layoutPath: string = '';
    /** Collection of widgets mapped to their respective container IDs. */
    public viewContent: DivContent[] = []
    /** The raw HTML content of the layout after it has been loaded. */
    public layoutHtml: string = null;
    /** Callback function to be executed when the view is fully loaded. */
    private onLoadFn: Function;
    /** If true, the target container will not be cleared before rendering. */
    preventClear: boolean;
    /** If true, enables the ID Dictionary to prevent collisions in the DOM. */
    dictionaryEnabled: boolean;

    /**
     * Private constructor to enforce the use of static 'from' method.
     * @param layoutPath Path to the view's HTML resource.
     */
    private constructor(layoutPath: string)
    {
        if (Misc.isNullOrEmpty(layoutPath))
            throw new Error('UIFlatView build failed: layoutPath is required.');
        this.layoutPath = layoutPath;
    }

    /** Global resolver function to modify or expand layout paths. */
    private static layoutResolverFn: Function;

    /**
     * Sets a global function to resolve layout paths dynamically.
     * Useful for adding prefixes or handling environment-specific paths.
     */
    public static setLayoutResolverFn(resolverFn: Function)
    {
        ViewBuilder.layoutResolverFn = resolverFn;
    }

    /**
     * Starts the building process by specifying the layout resource.
     * @param layoutPath The resource path or identifier.
     */
    public static from(layoutPath: string): ViewBuilder
    {
        var path = layoutPath;
        if (!Misc.isNull(ViewBuilder.layoutResolverFn))
            path = ViewBuilder.layoutResolverFn(path);
        return new ViewBuilder(path);
    }

    /**
     * Specifies the target container ID where the view should be rendered.
     */
    public to(targetDivID: string): ViewBuilder
    {
        this.targetId = targetDivID;
        return this;
    }

    /**
     * Configures the view to append content rather than replacing the container's inner HTML.
     */
    public preventClearFragment(): ViewBuilder
    {
        this.preventClear = true
        return this;
    }

    /**
     * Enables ID Dictionary mapping to ensure element IDs are unique per instance.
     */
    public useDictionary(): ViewBuilder
    {
        this.dictionaryEnabled = true
        return this;
    }

    /** The data model instance for synchronization. */
    private viewModelBind: any | object = null;

    /**
     * Binds a ViewModel instance to the view for data synchronization.
     * @param instance The object instance to bind.
     */
    public bindWith<TViewModel>(instance: TViewModel): ViewBuilder
    {
        this.viewModelBind = instance;
        return this;
    }

    /** Registry for property validation functions. */
    private modelValidations: any[] = []

    /**
     * Adds a validation rule for a specific property of the bound ViewModel.
     * @param propertyName The name of the property to validate.
     * @param validateFn The function that performs the validation.
     */
    public validate(propertyName: string, validateFn: Function): ViewBuilder
    {
        if (Misc.isNull(this.viewModelBind))
            throw new DefaultExceptionPage(new Error(`UIFlatViewBuilder: invalid call validate() function before calling bindingWith<>()`))
        this.modelValidations.push({ propertyName, validateFn })
        return this;
    }

    /**
     * Checks if a ViewModel has been bound to this builder.
     */
    public hasBinding()
    {
        return Misc.isNull(this.viewModelBind) == false;
    }

    /**
     * Creates and configures a BindingContext for the provided View.
     * @param view The UIView instance that will own the binding.
     */
    public getBinding(view: UIView): BindingContext<any | object>
    {
        const ctx = new BindingContext(this.viewModelBind, view);
        for (var v = 0; v < this.modelValidations.length; v++)
        {
            const valid = this.modelValidations[v]
            ctx.hasValidation(valid.propertyName, valid.validateFn)
        }
        return ctx;
    }

    /**
     * Maps one or more widgets to a specific container ID defined in the layout.
     * @param divId The ID of the container in the HTML.
     * @param w The widgets to place inside the container.
     */
    public put(divId: string, ...w: Widget[]): ViewBuilder
    {
        this.viewContent.push(
            new DivContent(divId, ...w)
        );
        return this;
    }

    /**
     * Allows modularizing view configuration by passing the builder to a helper function.
     * @param helperFn Function that receives this builder instance.
     */
    public helper(helperFn: (vb: ViewBuilder) => void): ViewBuilder
    {
        helperFn(this);
        return this;
    }

/**
     * Defines a lifecycle hook to be executed immediately after the View is fully 
     * initialized and all Widgets are bound to the layout.
     * * * Use this as the primary entry point for imperative logic, such as:
     * - Performing initial data loads into managed Widgets.
     * - Setting up complex event listeners or interactions between Widgets.
     * - Configuring Widget states (visibility, read-only, styles) based on the ViewModel.
     * - Running post-render calculations that require the WidgetContext to be active.
     * * * This hook ensures that you are interacting with fully instantiated UI Objects 
     * rather than raw DOM elements, maintaining the framework's abstraction layer.
     * * @param fn A callback function that receives the active WidgetContext.
     */
    public onLoad(fn: (ctx: WidgetContext) => void): ViewBuilder
    {
        this.onLoadFn = fn;
        return this;
    }

    /**
     * Internal call to execute the load callback.
     */
    callLoadFn(ctx: WidgetContext)
    {
        if (!Misc.isNull(this.onLoadFn))
            this.onLoadFn(ctx);
    }

    /** The translation server instance for this view. */
    public languageSrv: LanguageServer = null

    /**
     * Injects an internationalization (i18n) server for translating widgets.
     */
    public i18n(language: LanguageServer): ViewBuilder
    {
        this.languageSrv = language
        return this
    }
}