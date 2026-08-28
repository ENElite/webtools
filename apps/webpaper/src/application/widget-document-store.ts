import { parseWidgetDocument } from '@webtools/widget-core';
import type { WidgetCatalog, WidgetDocument } from '@webtools/widget-core';

export const WIDGET_DOCUMENT_STORAGE_KEY = 'webpaper.widget-document.v2';

export interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export type WidgetDocumentLoadResult =
    | { readonly kind: 'empty' }
    | { readonly kind: 'loaded'; readonly document: WidgetDocument }
    | { readonly kind: 'invalid'; readonly error: Error };

export function loadWidgetDocument(
    storage: KeyValueStorage,
    catalog: WidgetCatalog,
    key = WIDGET_DOCUMENT_STORAGE_KEY,
): WidgetDocumentLoadResult {
    const serialized = storage.getItem(key);
    if (serialized === null) return { kind: 'empty' };

    try {
        return {
            kind: 'loaded',
            document: parseWidgetDocument(JSON.parse(serialized), catalog),
        };
    } catch (cause) {
        return {
            kind: 'invalid',
            error: cause instanceof Error ? cause : new Error(String(cause)),
        };
    }
}

export function saveWidgetDocument(
    storage: KeyValueStorage,
    document: WidgetDocument,
    key = WIDGET_DOCUMENT_STORAGE_KEY,
): void {
    storage.setItem(key, JSON.stringify(document));
}
