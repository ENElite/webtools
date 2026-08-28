import { z } from 'zod';

import type { JsonValue } from './types';

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number().finite(),
        z.boolean(),
        z.null(),
        z.array(jsonValueSchema),
        z.record(z.string(), jsonValueSchema),
    ]),
);

export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export const widgetLayoutSchema = z.object({
    anchorX: z.enum(['left', 'center', 'right']),
    anchorY: z.enum(['top', 'center', 'bottom']),
    x: z.number().finite(),
    y: z.number().finite(),
    w: z.number().finite().positive(),
    h: z.number().finite().positive(),
    rotation: z.number().finite(),
    adapt: z.enum(['stretch', 'fixed', 'stretch-ratio', 'stick']),
    order: z.number().int().positive(),
}).strict();

export const widgetStyleSchema = z.object({
    outline: z.string().optional(),
    borderRadius: z.string().optional(),
    outlineOffset: z.string().optional(),
    opacity: z.number().finite().min(0).max(1).optional(),
    backgroundColor: z.string().optional(),
    backgroundEffect: z.enum(['blur', 'image', 'none']).optional(),
    backgroundImageUrl: z.string().optional(),
    shadowRadius: z.number().finite().nonnegative().optional(),
    shadowColor: z.string().optional(),
    overflow: z.boolean().optional(),
}).strict();

export const widgetEntitySchema = z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    label: z.string().min(1),
    props: jsonObjectSchema,
    style: widgetStyleSchema,
    layout: widgetLayoutSchema,
    locked: z.boolean(),
    autoHide: z.boolean(),
}).strict();

export const widgetDocumentSchema = z.object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    revision: z.number().int().nonnegative(),
    createdAt: z.number().finite().nonnegative(),
    updatedAt: z.number().finite().nonnegative(),
    widgets: z.array(widgetEntitySchema),
}).strict().superRefine((document, context) => {
    const ids = new Set<string>();

    document.widgets.forEach((widget, index) => {
        if (ids.has(widget.id)) {
            context.addIssue({
                code: 'custom',
                message: `Duplicate widget id: ${widget.id}`,
                path: ['widgets', index, 'id'],
            });
        }
        ids.add(widget.id);

        if (widget.layout.order !== index + 1) {
            context.addIssue({
                code: 'custom',
                message: 'Widget order must be contiguous and match document order',
                path: ['widgets', index, 'layout', 'order'],
            });
        }
    });

    if (document.updatedAt < document.createdAt) {
        context.addIssue({
            code: 'custom',
            message: 'updatedAt must not be earlier than createdAt',
            path: ['updatedAt'],
        });
    }
});
