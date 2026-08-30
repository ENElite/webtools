import { createElement } from 'react';
import type { ComponentType } from 'react';
import type {
    ComponentRuntimeSignalMap,
    JsonObject,
    SignalHub,
    WidgetEntity,
    WidgetKind,
} from '@webtools/widget-core';

export interface WidgetViewProps<TProps extends JsonObject = JsonObject> {
    readonly widget: WidgetEntity<TProps>;
    readonly selected: boolean;
    /** Shared signal/slot hub for time synchronization and component messages. */
    readonly signals: SignalHub<ComponentRuntimeSignalMap>;
    /** Completes this view's current scoped load attempt. */
    readonly onReady: () => void;
    /** Fails and settles this view's current scoped load attempt. */
    readonly onError: (error?: unknown) => void;
    /** Publishes progress for this view's current scoped load attempt. */
    readonly onProgress: (loaded: number, total: number) => void;
}

export interface WidgetViewDefinition<TProps extends JsonObject = JsonObject> {
    readonly kind: WidgetKind;
    readonly View: ComponentType<WidgetViewProps<TProps>>;
    /**
     * Returns the resource identity represented by this render. Omit this for
     * synchronous views; they complete automatically after their passive effect.
     */
    readonly readinessKey?: (widget: WidgetEntity<TProps>) => string | null;
}

/**
 * A type-erased view registration. The erasure is performed by
 * {@link defineWidgetView}, at the only boundary where a widget kind is paired
 * with the props type owned by that kind.
 */
export interface WidgetViewPlugin {
    readonly kind: WidgetKind;
    readonly View: ComponentType<WidgetViewProps>;
    readonly readinessKey?: (widget: WidgetEntity) => string | null;
}

export interface WidgetViewCatalog {
    readonly kinds: readonly WidgetKind[];
    has(kind: WidgetKind): boolean;
    get(kind: WidgetKind): WidgetViewPlugin;
}

export function defineWidgetView<TProps extends JsonObject>(
    definition: WidgetViewDefinition<TProps>,
): WidgetViewPlugin {
    const View: ComponentType<WidgetViewProps> = ({
        widget,
        selected,
        signals,
        onReady,
        onError,
        onProgress,
    }) =>
        createElement(definition.View, {
            widget: widget as WidgetEntity<TProps>,
            selected,
            signals,
            onReady,
            onError,
            onProgress,
        });

    if (!definition.readinessKey) return Object.freeze({ kind: definition.kind, View });
    const readinessKey = definition.readinessKey;
    return Object.freeze({
        kind: definition.kind,
        View,
        readinessKey: (widget: WidgetEntity) => readinessKey(widget as WidgetEntity<TProps>),
    });
}

export function createWidgetViewCatalog(plugins: readonly WidgetViewPlugin[]): WidgetViewCatalog {
    const registrations = new Map<WidgetKind, WidgetViewPlugin>();
    for (const plugin of plugins) {
        if (registrations.has(plugin.kind)) {
            throw new Error(`Duplicate widget view: ${plugin.kind}`);
        }
        registrations.set(plugin.kind, plugin);
    }

    return Object.freeze({
        kinds: Object.freeze([...registrations.keys()]),
        has: (kind: WidgetKind) => registrations.has(kind),
        get(kind: WidgetKind) {
            const registration = registrations.get(kind);
            if (!registration) {
                throw new Error(`No widget view registered for "${kind}"`);
            }
            return registration;
        },
    });
}
