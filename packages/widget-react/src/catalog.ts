import { createElement } from 'react';
import type { ComponentType } from 'react';
import type { JsonObject, WidgetEntity, WidgetKind } from '@webtools/widget-core';

export interface WidgetViewProps<TProps extends JsonObject = JsonObject> {
    readonly widget: WidgetEntity<TProps>;
    readonly selected: boolean;
}

export interface WidgetViewDefinition<TProps extends JsonObject = JsonObject> {
    readonly kind: WidgetKind;
    readonly View: ComponentType<WidgetViewProps<TProps>>;
}

/**
 * A type-erased view registration. The erasure is performed by
 * {@link defineWidgetView}, at the only boundary where a widget kind is paired
 * with the props type owned by that kind.
 */
export interface WidgetViewPlugin {
    readonly kind: WidgetKind;
    readonly View: ComponentType<WidgetViewProps>;
}

export interface WidgetViewCatalog {
    readonly kinds: readonly WidgetKind[];
    has(kind: WidgetKind): boolean;
    get(kind: WidgetKind): WidgetViewPlugin;
}

export function defineWidgetView<TProps extends JsonObject>(
    definition: WidgetViewDefinition<TProps>,
): WidgetViewPlugin {
    const View: ComponentType<WidgetViewProps> = ({ widget, selected }) =>
        createElement(definition.View, {
            widget: widget as WidgetEntity<TProps>,
            selected,
        });

    return Object.freeze({ kind: definition.kind, View });
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
