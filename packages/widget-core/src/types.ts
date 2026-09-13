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
    readonly outline?: string | undefined;
    readonly borderRadius?: string | undefined;
    readonly outlineOffset?: string | undefined;
    readonly opacity?: number | undefined;
    readonly backgroundColor?: string | undefined;
    readonly backgroundEffect?: 'blur' | 'image' | 'none' | undefined;
    readonly backgroundImageUrl?: string | undefined;
    readonly shadowRadius?: number | undefined;
    readonly shadowColor?: string | undefined;
    readonly overflow?: boolean | undefined;
}

export const WIDGET_ANIMATABLE_STYLE_PROPERTIES = [
    'opacity',
    'backgroundColor',
    'borderRadius',
    'outline',
    'outlineOffset',
    'boxShadow',
    'backdropFilter',
    'backgroundImage',
] as const;

export type WidgetAnimatedStyleProperty = typeof WIDGET_ANIMATABLE_STYLE_PROPERTIES[number];
export type WidgetAnimationEasing = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type WidgetEntryAnimationEffect = 'none' | 'fade' | 'slide' | 'scale';
export type WidgetAnimationDirection = 'up' | 'down' | 'left' | 'right';

/** One-shot animation played when a widget frame first enters the canvas. */
export interface WidgetEntryAnimationSettings {
    readonly effect: WidgetEntryAnimationEffect;
    readonly direction: WidgetAnimationDirection;
    /** Animation duration in seconds. */
    readonly duration: number;
    /** Animation delay in seconds. */
    readonly delay: number;
    readonly easing: WidgetAnimationEasing;
}

/** CSS transitions applied to selected, animatable outputs of {@link WidgetStyle}. */
export interface WidgetStyleTransitionSettings {
    readonly easing: WidgetAnimationEasing;
    /** Transition duration in seconds. */
    readonly duration: number;
    /** Transition delay in seconds. */
    readonly delay: number;
    readonly animatedProperties: readonly WidgetAnimatedStyleProperty[];
}

export interface WidgetAnimationSettings extends WidgetStyleTransitionSettings {
    readonly entry: WidgetEntryAnimationSettings;
}

export interface WidgetAnimationUpdate {
    readonly easing?: WidgetAnimationEasing;
    readonly duration?: number;
    readonly delay?: number;
    readonly animatedProperties?: readonly WidgetAnimatedStyleProperty[];
    readonly entry?: Partial<WidgetEntryAnimationSettings>;
}

export const DEFAULT_WIDGET_ENTRY_ANIMATION: WidgetEntryAnimationSettings = Object.freeze({
    effect: 'none',
    direction: 'up',
    duration: 0.45,
    delay: 0,
    easing: 'ease-out',
});

export const DEFAULT_WIDGET_ANIMATION: WidgetAnimationSettings = Object.freeze({
    easing: 'ease-out',
    duration: 0.3,
    delay: 0,
    animatedProperties: Object.freeze([]),
    entry: DEFAULT_WIDGET_ENTRY_ANIMATION,
});

export interface WidgetEntity<TProps extends JsonObject = JsonObject> {
    readonly id: WidgetId;
    readonly kind: WidgetKind;
    readonly label: string;
    readonly props: TProps;
    readonly style: WidgetStyle;
    readonly animation: WidgetAnimationSettings;
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
    /** Plugin-owned starting geometry, merged over the engine defaults when a widget is added. */
    readonly defaultLayout?: Partial<Omit<WidgetLayout, 'order'>>
        | (() => Partial<Omit<WidgetLayout, 'order'>>);
}

export interface WidgetDraft {
    readonly id?: WidgetId;
    readonly kind: WidgetKind;
    readonly label?: string;
    readonly props?: JsonObject;
    readonly style?: WidgetStyle;
    readonly animation?: WidgetAnimationUpdate;
    readonly layout?: Partial<Omit<WidgetLayout, 'order'>>;
    readonly locked?: boolean;
    readonly autoHide?: boolean;
}

export interface WidgetUpdate {
    readonly label?: string;
    /** Props are shallow-merged and then checked by the owning plugin schema. */
    readonly props?: JsonObject;
    readonly style?: WidgetStyle;
    /** Animation settings are shallow-merged and normalized by the engine schema. */
    readonly animation?: WidgetAnimationUpdate;
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
