import type { z } from 'zod';

export type WidgetId = string;
export type WidgetKind = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

export type WidgetHorizontalAnchor = 'left' | 'center' | 'right';
export type WidgetVerticalAnchor = 'top' | 'center' | 'bottom';
export type WidgetAdaptMode = 'stretch' | 'fixed' | 'stretch-ratio' | 'stick';

export interface WidgetLayout {
    readonly anchorX: WidgetHorizontalAnchor;
    readonly anchorY: WidgetVerticalAnchor;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly rotation: number;
    readonly adapt: WidgetAdaptMode;
    readonly order: number;
}

export interface WidgetStyle {
    readonly outline?: string;
    readonly borderRadius?: string;
    readonly outlineOffset?: string;
    readonly opacity?: number;
    readonly backgroundColor?: string;
    readonly backgroundEffect?: 'blur' | 'image' | 'none';
    readonly backgroundImageUrl?: string;
    readonly shadowRadius?: number;
    readonly shadowColor?: string;
    readonly overflow?: boolean;
}

export interface WidgetEntity<TProps extends JsonObject = JsonObject> {
    readonly id: WidgetId;
    readonly kind: WidgetKind;
    readonly label: string;
    readonly props: TProps;
    readonly style: WidgetStyle;
    readonly layout: WidgetLayout;
    readonly locked: boolean;
    readonly autoHide: boolean;
}

export interface WidgetDocument {
    readonly schemaVersion: 1;
    readonly id: string;
    readonly revision: number;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly widgets: readonly WidgetEntity[];
}

export interface PluginDefinition<TProps extends JsonObject = JsonObject> {
    readonly kind: WidgetKind;
    readonly label: string;
    readonly propsSchema: z.ZodType<TProps>;
    readonly defaultProps: TProps | (() => TProps);
}

export interface WidgetDraft {
    readonly id?: WidgetId;
    readonly kind: WidgetKind;
    readonly label?: string;
    readonly props?: JsonObject;
    readonly style?: WidgetStyle;
    readonly layout?: Partial<Omit<WidgetLayout, 'order'>>;
    readonly locked?: boolean;
    readonly autoHide?: boolean;
}

export interface WidgetUpdate {
    readonly label?: string;
    /** Props are shallow-merged and then checked by the owning plugin schema. */
    readonly props?: JsonObject;
    readonly style?: WidgetStyle;
    readonly locked?: boolean;
    readonly autoHide?: boolean;
}

export type WidgetOperation =
    | { readonly type: 'widget.add'; readonly widget: WidgetDraft; readonly at?: number }
    | { readonly type: 'widget.remove'; readonly widgetId: WidgetId }
    | { readonly type: 'widget.update'; readonly widgetId: WidgetId; readonly changes: WidgetUpdate }
    | { readonly type: 'widget.layout'; readonly widgetId: WidgetId; readonly changes: Partial<Omit<WidgetLayout, 'order'>> }
    | { readonly type: 'widget.reorder'; readonly widgetId: WidgetId; readonly toIndex: number }
    /** Exact operations are emitted by inverse transactions and remain public for persistence/debug tooling. */
    | { readonly type: 'widget.restore'; readonly widget: WidgetEntity; readonly at: number }
    | { readonly type: 'widget.replace'; readonly widget: WidgetEntity };

export interface WidgetTransaction {
    readonly operations: readonly WidgetOperation[];
    readonly description?: string;
}

interface EventBase {
    readonly timestamp: number;
    readonly revision: number;
    readonly widgetId: WidgetId;
}

export type WidgetDomainEvent =
    | (EventBase & { readonly type: 'widget.added'; readonly index: number })
    | (EventBase & { readonly type: 'widget.removed'; readonly index: number })
    | (EventBase & { readonly type: 'widget.updated'; readonly fields: readonly string[] })
    | (EventBase & { readonly type: 'widget.layout-changed'; readonly fields: readonly string[] })
    | (EventBase & { readonly type: 'widget.reordered'; readonly fromIndex: number; readonly toIndex: number });

export interface DispatchResult {
    readonly document: WidgetDocument;
    readonly events: readonly WidgetDomainEvent[];
    /** Materialized transaction (generated ids/defaults have been resolved). */
    readonly transaction: WidgetTransaction;
    readonly inverse: WidgetTransaction;
}

export interface WidgetEngineSnapshot {
    readonly document: WidgetDocument;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}

export type IdGenerator = (scope: 'document' | 'widget') => string;
export type Clock = () => number;

export interface WidgetEngineOptions {
    readonly catalog: WidgetCatalog;
    readonly document?: unknown;
    readonly idGenerator?: IdGenerator;
    readonly clock?: Clock;
    readonly historyLimit?: number;
}

export interface WidgetEngine {
    getSnapshot(): WidgetEngineSnapshot;
    subscribe(listener: () => void): () => void;
    dispatch(operation: WidgetOperation | WidgetTransaction): DispatchResult;
    undo(): DispatchResult | null;
    redo(): DispatchResult | null;
    clearHistory(): void;
}

export interface WidgetCatalog {
    readonly kinds: readonly WidgetKind[];
    has(kind: WidgetKind): boolean;
    get(kind: WidgetKind): PluginDefinition;
    createProps(kind: WidgetKind, input?: JsonObject): JsonObject;
    validateProps(kind: WidgetKind, input: unknown): JsonObject;
}
