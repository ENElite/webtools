import { widgetEntitySchema } from './schemas';
import { resolveDefaultLayout } from './catalog';
import { createEmptyWidgetDocument, parseWidgetDocument } from './document';
import { isWidgetTransaction } from './transaction';
import type {
    Clock,
    DispatchResult,
    IdGenerator,
    WidgetCatalog,
    WidgetDocument,
    WidgetDomainEvent,
    WidgetDraft,
    WidgetEngine,
    WidgetEngineOptions,
    WidgetEngineSnapshot,
    WidgetEntity,
    WidgetLayout,
    WidgetOperation,
    WidgetTransaction,
} from './types';

const DEFAULT_HISTORY_LIMIT = 100;

export const DEFAULT_WIDGET_LAYOUT: Omit<WidgetLayout, 'order'> = Object.freeze({
    anchorX: 'left',
    anchorY: 'top',
    x: 5,
    y: 5,
    w: 40,
    h: 16,
    rotation: 0,
    adapt: 'stretch',
});

type PendingEvent =
    | { readonly type: 'widget.added'; readonly widgetId: string; readonly index: number }
    | { readonly type: 'widget.removed'; readonly widgetId: string; readonly index: number }
    | { readonly type: 'widget.updated'; readonly widgetId: string; readonly fields: readonly string[] }
    | { readonly type: 'widget.layout-changed'; readonly widgetId: string; readonly fields: readonly string[] }
    | { readonly type: 'widget.reordered'; readonly widgetId: string; readonly fromIndex: number; readonly toIndex: number };

interface AppliedOperation {
    readonly widgets: readonly WidgetEntity[];
    readonly forward: WidgetOperation;
    readonly inverse: WidgetOperation;
    readonly event: PendingEvent;
}

interface AppliedTransaction {
    readonly document: WidgetDocument;
    readonly events: readonly WidgetDomainEvent[];
    readonly transaction: WidgetTransaction;
    readonly inverse: WidgetTransaction;
}

interface HistoryEntry {
    readonly forward: WidgetTransaction;
    readonly inverse: WidgetTransaction;
}

export function createWidgetEngine(options: WidgetEngineOptions): WidgetEngine {
    const clock = options.clock ?? Date.now;
    const idGenerator = options.idGenerator ?? createDefaultIdGenerator(clock);
    const historyLimit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT;

    if (!Number.isInteger(historyLimit) || historyLimit < 0) {
        throw new Error('historyLimit must be a non-negative integer');
    }

    let document = freeze(
        options.document === undefined
            ? createEmptyWidgetDocument(idGenerator, clock)
            : parseWidgetDocument(options.document, options.catalog),
    );
    let past: HistoryEntry[] = [];
    let future: HistoryEntry[] = [];
    let snapshot = createSnapshot(document, false, false);
    const listeners = new Set<() => void>();

    const publish = (): void => {
        snapshot = createSnapshot(document, past.length > 0, future.length > 0);
        for (const listener of listeners) {
            listener();
        }
    };

    const apply = (transaction: WidgetTransaction): AppliedTransaction =>
        applyTransaction(document, transaction, options.catalog, idGenerator, clock);

    return {
        getSnapshot(): WidgetEngineSnapshot {
            return snapshot;
        },
        subscribe(listener: () => void): () => void {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        dispatch(input: WidgetOperation | WidgetTransaction): DispatchResult {
            const transaction = isWidgetTransaction(input)
                ? input
                : { operations: [input] };
            const result = apply(transaction);

            if (result.transaction.operations.length === 0) {
                return result;
            }

            document = result.document;
            if (historyLimit > 0) {
                past = [...past, { forward: result.transaction, inverse: result.inverse }]
                    .slice(-historyLimit);
            }
            future = [];
            publish();
            return result;
        },
        undo(): DispatchResult | null {
            const entry = past.at(-1);
            if (!entry) {
                return null;
            }

            const result = apply(entry.inverse);
            document = result.document;
            past = past.slice(0, -1);
            future = [...future, entry];
            publish();
            return result;
        },
        redo(): DispatchResult | null {
            const entry = future.at(-1);
            if (!entry) {
                return null;
            }

            const result = apply(entry.forward);
            document = result.document;
            future = future.slice(0, -1);
            past = [...past, { forward: result.transaction, inverse: result.inverse }]
                .slice(-historyLimit);
            publish();
            return result;
        },
        clearHistory(): void {
            if (past.length === 0 && future.length === 0) {
                return;
            }
            past = [];
            future = [];
            publish();
        },
    };
}

function applyTransaction(
    currentDocument: WidgetDocument,
    transaction: WidgetTransaction,
    catalog: WidgetCatalog,
    idGenerator: IdGenerator,
    clock: Clock,
): AppliedTransaction {
    let widgets = currentDocument.widgets;
    const forward: WidgetOperation[] = [];
    const inverse: WidgetOperation[] = [];
    const pendingEvents: PendingEvent[] = [];

    for (const operation of transaction.operations) {
        const applied = applyOperation(widgets, operation, catalog, idGenerator);
        if (!applied) {
            continue;
        }

        widgets = applied.widgets;
        forward.push(applied.forward);
        inverse.unshift(applied.inverse);
        pendingEvents.push(applied.event);
    }

    const materializedTransaction = withDescription(forward, transaction.description);
    const inverseTransaction = withDescription(inverse, inverseDescription(transaction.description));

    if (forward.length === 0) {
        return freeze({
            document: currentDocument,
            events: [],
            transaction: materializedTransaction,
            inverse: inverseTransaction,
        });
    }

    const timestamp = Math.max(clock(), currentDocument.updatedAt);
    const revision = currentDocument.revision + 1;
    const nextDocument = parseWidgetDocument({
        ...currentDocument,
        revision,
        updatedAt: timestamp,
        widgets,
    }, catalog);
    const events = pendingEvents.map((event) => ({
        ...event,
        timestamp,
        revision,
    })) as WidgetDomainEvent[];

    return freeze({
        document: nextDocument,
        events,
        transaction: materializedTransaction,
        inverse: inverseTransaction,
    });
}

function applyOperation(
    widgets: readonly WidgetEntity[],
    operation: WidgetOperation,
    catalog: WidgetCatalog,
    idGenerator: IdGenerator,
): AppliedOperation | null {
    switch (operation.type) {
        case 'widget.add':
            return addWidget(widgets, createEntity(operation.widget, catalog, idGenerator), operation.at);
        case 'widget.restore':
            return addWidget(widgets, validateEntity(operation.widget, catalog), operation.at);
        case 'widget.remove': {
            const index = findWidgetIndex(widgets, operation.widgetId);
            const widget = widgets[index];
            if (!widget) {
                throw new Error(`Widget not found: ${operation.widgetId}`);
            }
            return {
                widgets: normalizeOrders(widgets.filter((candidate) => candidate.id !== operation.widgetId)),
                forward: operation,
                inverse: { type: 'widget.restore', widget, at: index },
                event: { type: 'widget.removed', widgetId: widget.id, index },
            };
        }
        case 'widget.update': {
            const index = findWidgetIndex(widgets, operation.widgetId);
            const previous = widgets[index];
            if (!previous) {
                throw new Error(`Widget not found: ${operation.widgetId}`);
            }
            const fields = Object.keys(operation.changes);
            if (fields.length === 0) {
                return null;
            }
            const changes = operation.changes;
            const props = changes.props === undefined
                ? previous.props
                : catalog.validateProps(previous.kind, { ...previous.props, ...changes.props });
            const next = validateEntity({
                ...previous,
                ...(changes.label === undefined ? {} : { label: changes.label }),
                ...(changes.style === undefined ? {} : { style: { ...previous.style, ...changes.style } }),
                ...(changes.locked === undefined ? {} : { locked: changes.locked }),
                ...(changes.autoHide === undefined ? {} : { autoHide: changes.autoHide }),
                props,
            }, catalog);
            if (equal(previous, next)) {
                return null;
            }
            return replaceAt(widgets, index, previous, next, fields, 'widget.updated');
        }
        case 'widget.layout': {
            const index = findWidgetIndex(widgets, operation.widgetId);
            const previous = widgets[index];
            if (!previous) {
                throw new Error(`Widget not found: ${operation.widgetId}`);
            }
            const fields = Object.keys(operation.changes);
            if (fields.length === 0) {
                return null;
            }
            const next = validateEntity({
                ...previous,
                layout: { ...previous.layout, ...operation.changes },
            }, catalog);
            if (equal(previous, next)) {
                return null;
            }
            return replaceAt(widgets, index, previous, next, fields, 'widget.layout-changed');
        }
        case 'widget.reorder': {
            const fromIndex = findWidgetIndex(widgets, operation.widgetId);
            assertIndex(operation.toIndex, widgets.length, false);
            if (fromIndex === operation.toIndex) {
                return null;
            }
            const reordered = [...widgets];
            const [widget] = reordered.splice(fromIndex, 1);
            if (!widget) {
                throw new Error(`Widget not found: ${operation.widgetId}`);
            }
            reordered.splice(operation.toIndex, 0, widget);
            return {
                widgets: normalizeOrders(reordered),
                forward: operation,
                inverse: { type: 'widget.reorder', widgetId: widget.id, toIndex: fromIndex },
                event: {
                    type: 'widget.reordered',
                    widgetId: widget.id,
                    fromIndex,
                    toIndex: operation.toIndex,
                },
            };
        }
        case 'widget.replace': {
            const index = findWidgetIndex(widgets, operation.widget.id);
            const previous = widgets[index];
            if (!previous) {
                throw new Error(`Widget not found: ${operation.widget.id}`);
            }
            const next = validateEntity(operation.widget, catalog);
            if (equal(previous, next)) {
                return null;
            }
            return replaceAt(widgets, index, previous, next, ['entity'], 'widget.updated');
        }
    }
}

function addWidget(
    widgets: readonly WidgetEntity[],
    widget: WidgetEntity,
    requestedIndex: number | undefined,
): AppliedOperation {
    if (widgets.some((candidate) => candidate.id === widget.id)) {
        throw new Error(`Duplicate widget id: ${widget.id}`);
    }
    const index = requestedIndex ?? widgets.length;
    assertIndex(index, widgets.length, true);
    const next = [...widgets];
    next.splice(index, 0, widget);
    const normalized = normalizeOrders(next);
    const materialized = normalized[index];
    if (!materialized) {
        throw new Error('Failed to materialize widget');
    }
    return {
        widgets: normalized,
        forward: { type: 'widget.restore', widget: materialized, at: index },
        inverse: { type: 'widget.remove', widgetId: widget.id },
        event: { type: 'widget.added', widgetId: widget.id, index },
    };
}

function replaceAt(
    widgets: readonly WidgetEntity[],
    index: number,
    previous: WidgetEntity,
    next: WidgetEntity,
    fields: readonly string[],
    eventType: 'widget.updated' | 'widget.layout-changed',
): AppliedOperation {
    const updated = [...widgets];
    updated[index] = next;
    return {
        widgets: updated,
        forward: { type: 'widget.replace', widget: next },
        inverse: { type: 'widget.replace', widget: previous },
        event: { type: eventType, widgetId: next.id, fields },
    };
}

function createEntity(
    draft: WidgetDraft,
    catalog: WidgetCatalog,
    idGenerator: IdGenerator,
): WidgetEntity {
    const plugin = catalog.get(draft.kind);
    return validateEntity({
        id: draft.id ?? idGenerator('widget'),
        kind: draft.kind,
        label: draft.label ?? plugin.label,
        props: catalog.createProps(draft.kind, draft.props),
        style: draft.style ?? {},
        layout: {
            ...DEFAULT_WIDGET_LAYOUT,
            ...resolveDefaultLayout(plugin),
            ...draft.layout,
            order: 1,
        },
        locked: draft.locked ?? false,
        autoHide: draft.autoHide ?? false,
    }, catalog);
}

function validateEntity(input: unknown, catalog: WidgetCatalog): WidgetEntity {
    const widget = widgetEntitySchema.parse(input);
    const props = catalog.validateProps(widget.kind, widget.props);
    return { ...widget, props };
}

function normalizeOrders(widgets: readonly WidgetEntity[]): readonly WidgetEntity[] {
    return widgets.map((widget, index) => {
        const order = index + 1;
        return widget.layout.order === order
            ? widget
            : { ...widget, layout: { ...widget.layout, order } };
    });
}

function findWidgetIndex(widgets: readonly WidgetEntity[], widgetId: string): number {
    const index = widgets.findIndex((widget) => widget.id === widgetId);
    if (index < 0) {
        throw new Error(`Widget not found: ${widgetId}`);
    }
    return index;
}

function assertIndex(index: number, length: number, allowEnd: boolean): void {
    const maximum = allowEnd ? length : length - 1;
    if (!Number.isInteger(index) || index < 0 || index > maximum) {
        throw new Error(`Widget index out of range: ${index}`);
    }
}

function withDescription(
    operations: readonly WidgetOperation[],
    description: string | undefined,
): WidgetTransaction {
    return description === undefined
        ? { operations }
        : { operations, description };
}

function inverseDescription(description: string | undefined): string | undefined {
    return description === undefined ? undefined : `Undo: ${description}`;
}

function createSnapshot(
    document: WidgetDocument,
    canUndo: boolean,
    canRedo: boolean,
): WidgetEngineSnapshot {
    return freeze({ document, canUndo, canRedo });
}

function createDefaultIdGenerator(clock: Clock): IdGenerator {
    let sequence = 0;
    const salt = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
    return (scope) => `${scope}_${clock().toString(36)}_${salt}_${(sequence++).toString(36)}`;
}

function equal(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function freeze<T>(value: T): T {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) {
            freeze(child);
        }
        Object.freeze(value);
    }
    return value;
}
