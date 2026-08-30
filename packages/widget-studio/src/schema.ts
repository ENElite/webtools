import type { ComponentType } from 'react';
import { WIDGET_ANIMATABLE_STYLE_PROPERTIES } from '@webtools/widget-core';
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
    readonly id?: string;
    readonly 'aria-describedby'?: string;
    readonly 'aria-errormessage'?: string;
    readonly 'aria-invalid'?: boolean;
    readonly required?: boolean;
    readonly disabled?: boolean;
    readonly readOnly?: boolean;
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

export const COMMON_WIDGET_INSPECTOR_SCHEMA: InspectorSchema = Object.freeze({
    pages: Object.freeze([
        { key: 'basic', label: '基本', order: -400 },
        { key: 'layout', label: '布局', order: -300 },
        { key: 'style', label: '样式', order: -200 },
        { key: 'animation', label: '动画', order: -100 },
    ]),
    fields: Object.freeze([
        { key: 'common-label', label: '名称', path: 'label', control: 'string', page: 'basic', order: 100 },
        { key: 'common-locked', label: '锁定', path: 'locked', control: 'boolean', page: 'basic', order: 200 },
        { key: 'common-auto-hide', label: '自动隐藏', path: 'autoHide', control: 'boolean', page: 'basic', order: 300 },

        { key: 'common-x', label: 'X', path: 'layout.x', control: 'number', page: 'layout', order: 100, step: 0.1 },
        { key: 'common-y', label: 'Y', path: 'layout.y', control: 'number', page: 'layout', order: 200, step: 0.1 },
        { key: 'common-width', label: '宽度', path: 'layout.w', control: 'number', page: 'layout', order: 300, min: 0.1, step: 0.1 },
        { key: 'common-height', label: '高度', path: 'layout.h', control: 'number', page: 'layout', order: 400, min: 0.1, step: 0.1 },
        { key: 'common-rotation', label: '旋转', path: 'layout.rotation', control: 'number', page: 'layout', order: 500, step: 1 },
        {
            key: 'common-anchor-x',
            label: '水平锚点',
            path: 'layout.anchorX',
            control: 'enum',
            page: 'layout',
            order: 600,
            options: [
                { label: '左', value: 'left' },
                { label: '中', value: 'center' },
                { label: '右', value: 'right' },
            ],
        },
        {
            key: 'common-anchor-y',
            label: '垂直锚点',
            path: 'layout.anchorY',
            control: 'enum',
            page: 'layout',
            order: 700,
            options: [
                { label: '上', value: 'top' },
                { label: '中', value: 'center' },
                { label: '下', value: 'bottom' },
            ],
        },
        {
            key: 'common-adapt',
            label: '适配方式',
            path: 'layout.adapt',
            control: 'enum',
            page: 'layout',
            order: 800,
            options: [
                { label: '拉伸', value: 'stretch' },
                { label: '固定', value: 'fixed' },
                { label: '等比拉伸', value: 'stretch-ratio' },
                { label: '贴附', value: 'stick' },
            ],
        },

        { key: 'common-opacity', label: '透明度', path: 'style.opacity', control: 'slider', page: 'style', order: 100, min: 0, max: 1, step: 0.01 },
        { key: 'common-background', label: '背景', path: 'style.backgroundColor', control: 'color', page: 'style', order: 200 },
        {
            key: 'common-background-effect',
            label: '背景效果',
            path: 'style.backgroundEffect',
            control: 'enum',
            page: 'style',
            order: 300,
            options: [
                { label: '无', value: 'none' },
                { label: '模糊', value: 'blur' },
                { label: '图片', value: 'image' },
            ],
        },
        {
            key: 'common-background-image',
            label: '背景图片 URL',
            path: 'style.backgroundImageUrl',
            control: 'string',
            page: 'style',
            order: 400,
            visibleWhen: { path: 'style.backgroundEffect', equals: 'image' },
        },
        { key: 'common-border', label: '边框', path: 'style.outline', control: 'string', page: 'style', order: 500, description: '例如 1px solid #ffffff' },
        { key: 'common-border-radius', label: '圆角', path: 'style.borderRadius', control: 'string', page: 'style', order: 600, description: '例如 12px' },
        { key: 'common-outline-offset', label: '边框偏移', path: 'style.outlineOffset', control: 'string', page: 'style', order: 700, description: '例如 0px' },
        { key: 'common-shadow-radius', label: '阴影半径', path: 'style.shadowRadius', control: 'number', page: 'style', order: 800, min: 0, step: 1 },
        { key: 'common-shadow-color', label: '阴影颜色', path: 'style.shadowColor', control: 'color', page: 'style', order: 900 },
        { key: 'common-overflow', label: '允许溢出', path: 'style.overflow', control: 'boolean', page: 'style', order: 1000 },

        {
            key: 'common-easing',
            label: '缓动曲线',
            path: 'animation.easing',
            control: 'enum',
            page: 'animation',
            group: '样式过渡',
            order: 100,
            options: [
                { label: '缓出', value: 'ease-out' },
                { label: '缓入', value: 'ease-in' },
                { label: '缓入缓出', value: 'ease-in-out' },
                { label: '标准', value: 'ease' },
                { label: '线性', value: 'linear' },
            ],
        },
        { key: 'common-duration', label: '时长（秒）', path: 'animation.duration', control: 'slider', page: 'animation', group: '样式过渡', order: 200, min: 0, max: 5, step: 0.05 },
        { key: 'common-delay', label: '延迟（秒）', path: 'animation.delay', control: 'slider', page: 'animation', group: '样式过渡', order: 300, min: 0, max: 5, step: 0.05 },
        {
            key: 'common-animated-properties',
            label: '动画属性',
            path: 'animation.animatedProperties',
            control: 'tags',
            page: 'animation',
            group: '样式过渡',
            order: 400,
            description: `支持：${WIDGET_ANIMATABLE_STYLE_PROPERTIES.join('、')}`,
        },
        {
            key: 'common-entry-effect',
            label: '入场效果',
            path: 'animation.entry.effect',
            control: 'enum',
            page: 'animation',
            group: '入场动画',
            order: 500,
            options: [
                { label: '无', value: 'none' },
                { label: '淡入', value: 'fade' },
                { label: '滑入', value: 'slide' },
                { label: '缩放', value: 'scale' },
            ],
        },
        {
            key: 'common-entry-direction',
            label: '滑入方向',
            path: 'animation.entry.direction',
            control: 'enum',
            page: 'animation',
            group: '入场动画',
            order: 600,
            visibleWhen: { path: 'animation.entry.effect', equals: 'slide' },
            options: [
                { label: '向上', value: 'up' },
                { label: '向下', value: 'down' },
                { label: '向左', value: 'left' },
                { label: '向右', value: 'right' },
            ],
        },
        { key: 'common-entry-duration', label: '入场时长（秒）', path: 'animation.entry.duration', control: 'slider', page: 'animation', group: '入场动画', order: 700, min: 0, max: 5, step: 0.05 },
        { key: 'common-entry-delay', label: '入场延迟（秒）', path: 'animation.entry.delay', control: 'slider', page: 'animation', group: '入场动画', order: 800, min: 0, max: 5, step: 0.05 },
        {
            key: 'common-entry-easing',
            label: '入场缓动',
            path: 'animation.entry.easing',
            control: 'enum',
            page: 'animation',
            group: '入场动画',
            order: 900,
            options: [
                { label: '缓出', value: 'ease-out' },
                { label: '缓入', value: 'ease-in' },
                { label: '缓入缓出', value: 'ease-in-out' },
                { label: '标准', value: 'ease' },
                { label: '线性', value: 'linear' },
            ],
        },
    ]),
});

export function mergeCommonWidgetInspectorSchema(schema: InspectorSchema): InspectorSchema {
    const pluginPaths = new Set(schema.fields.map((field) => field.path));
    const fields = [
        ...COMMON_WIDGET_INSPECTOR_SCHEMA.fields.filter((field) => !pluginPaths.has(field.path)),
        ...schema.fields,
    ];
    const pages = new Map<string, InspectorPage>();
    for (const page of COMMON_WIDGET_INSPECTOR_SCHEMA.pages ?? []) pages.set(page.key, page);
    for (const page of schema.pages ?? []) {
        const common = pages.get(page.key);
        pages.set(page.key, common?.order !== undefined && page.order === undefined
            ? { ...page, order: common.order }
            : page);
    }
    for (const field of schema.fields) {
        const key = field.page ?? 'main';
        if (!pages.has(key)) pages.set(key, { key, label: key === 'main' ? '属性' : key });
    }
    return Object.freeze({
        fields: Object.freeze(fields),
        pages: Object.freeze([...pages.values()]),
    });
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
        schemas.set(definition.kind, Object.freeze({
            ...definition,
            schema: mergeCommonWidgetInspectorSchema(definition.schema),
        }));
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
