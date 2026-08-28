import type { ComponentType } from 'react';
import type { JsonObject, JsonValue, WidgetKind } from '@webtools/widget-core';

export type InspectorControlKind =
    | 'string'
    | 'number'
    | 'slider'
    | 'boolean'
    | 'enum'
    | 'color'
    | 'tags'
    | 'code';

export interface InspectorOption {
    readonly label: string;
    readonly value: string | number;
}

export interface InspectorField {
    readonly key: string;
    readonly label: string;
    readonly path: string;
    readonly control: InspectorControlKind | string;
    readonly page?: string;
    readonly group?: string;
    readonly order?: number;
    readonly description?: string;
    readonly options?: readonly InspectorOption[];
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly language?: string;
    readonly visibleWhen?: {
        readonly path: string;
        readonly equals: JsonValue;
    };
}

export interface InspectorPage {
    readonly key: string;
    readonly label: string;
    readonly order?: number;
}

export interface InspectorSchema {
    readonly fields: readonly InspectorField[];
    readonly pages?: readonly InspectorPage[];
}

export interface WidgetInspectorDefinition {
    readonly kind: WidgetKind;
    readonly schema: InspectorSchema;
}

export interface InspectorControlProps {
    readonly field: InspectorField;
    readonly value: JsonValue | undefined;
    readonly onChange: (value: JsonValue | undefined) => void;
}

export interface InspectorControlDefinition {
    readonly kind: string;
    readonly Control: ComponentType<InspectorControlProps>;
}

export interface InspectorControlCatalog {
    has(kind: string): boolean;
    get(kind: string): InspectorControlDefinition;
}

export interface WidgetInspectorCatalog {
    readonly kinds: readonly WidgetKind[];
    has(kind: WidgetKind): boolean;
    get(kind: WidgetKind): WidgetInspectorDefinition;
}

export function createInspectorControlCatalog(
    definitions: readonly InspectorControlDefinition[],
): InspectorControlCatalog {
    const controls = new Map<string, InspectorControlDefinition>();
    for (const definition of definitions) {
        if (controls.has(definition.kind)) throw new Error(`Duplicate inspector control: ${definition.kind}`);
        controls.set(definition.kind, Object.freeze(definition));
    }
    return Object.freeze({
        has: (kind: string) => controls.has(kind),
        get(kind: string) {
            const control = controls.get(kind);
            if (!control) throw new Error(`Unknown inspector control: ${kind}`);
            return control;
        },
    });
}

export function createWidgetInspectorCatalog(
    definitions: readonly WidgetInspectorDefinition[],
): WidgetInspectorCatalog {
    const schemas = new Map<WidgetKind, WidgetInspectorDefinition>();
    for (const definition of definitions) {
        if (schemas.has(definition.kind)) throw new Error(`Duplicate widget inspector: ${definition.kind}`);
        schemas.set(definition.kind, Object.freeze(definition));
    }
    return Object.freeze({
        kinds: Object.freeze([...schemas.keys()]),
        has: (kind: WidgetKind) => schemas.has(kind),
        get(kind: WidgetKind) {
            const schema = schemas.get(kind);
            if (!schema) throw new Error(`No inspector schema registered for "${kind}"`);
            return schema;
        },
    });
}

export type FormRecord = JsonObject;
