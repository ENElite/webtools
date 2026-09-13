import type { Clock, IdGenerator, WidgetCatalog, WidgetDocument } from './types';
import { widgetDocumentSchema } from './schemas';

export function createEmptyWidgetDocument(
    idGenerator: IdGenerator,
    clock: Clock,
): WidgetDocument {
    const timestamp = clock();
    return widgetDocumentSchema.parse({
        schemaVersion: 1,
        id: idGenerator('document'),
        revision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        widgets: [],
    });
}

export function parseWidgetDocument(
    input: unknown,
    catalog?: WidgetCatalog,
): WidgetDocument {
    const document = widgetDocumentSchema.parse(input);

    if (catalog) {
        for (const widget of document.widgets) {
            catalog.validateProps(widget.kind, widget.props);
        }
    }

    return document;
}
