import { z } from 'zod';

import {
    DEFAULT_WIDGET_ANIMATION,
    DEFAULT_WIDGET_ENTRY_ANIMATION,
    WIDGET_ANIMATABLE_STYLE_PROPERTIES,
} from './types';
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

export const widgetAnimationSchema = z.object({
    easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'])
        .default(DEFAULT_WIDGET_ANIMATION.easing),
    duration: z.number().finite().nonnegative().default(DEFAULT_WIDGET_ANIMATION.duration),
    delay: z.number().finite().nonnegative().default(DEFAULT_WIDGET_ANIMATION.delay),
    animatedProperties: z.array(z.enum(WIDGET_ANIMATABLE_STYLE_PROPERTIES))
        .refine((properties) => new Set(properties).size === properties.length, {
            message: 'Animated properties must be unique',
        })
        .default([...DEFAULT_WIDGET_ANIMATION.animatedProperties]),
    entry: z.object({
        effect: z.enum(['none', 'fade', 'slide', 'scale'])
            .default(DEFAULT_WIDGET_ENTRY_ANIMATION.effect),
        direction: z.enum(['up', 'down', 'left', 'right'])
            .default(DEFAULT_WIDGET_ENTRY_ANIMATION.direction),
        duration: z.number().finite().nonnegative()
            .default(DEFAULT_WIDGET_ENTRY_ANIMATION.duration),
        delay: z.number().finite().nonnegative()
            .default(DEFAULT_WIDGET_ENTRY_ANIMATION.delay),
        easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'])
            .default(DEFAULT_WIDGET_ENTRY_ANIMATION.easing),
    }).strict().default({ ...DEFAULT_WIDGET_ENTRY_ANIMATION }),
}).strict().default({
    ...DEFAULT_WIDGET_ANIMATION,
    animatedProperties: [...DEFAULT_WIDGET_ANIMATION.animatedProperties],
    entry: { ...DEFAULT_WIDGET_ENTRY_ANIMATION },
});

export const widgetEntitySchema = z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    label: z.string().min(1),
    props: jsonObjectSchema,
    style: widgetStyleSchema,
    animation: widgetAnimationSchema,
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
