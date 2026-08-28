import type { InspectorSchema, BindPath } from '@webtools/webwidget';

/**
 * Json Provider 的 schema 定义
 */
export const PROVIDER_JSON_SCHEMA: InspectorSchema = [
    {
        key: 'content',
        label: 'JSON 内容',
        type: 'editor',
        bind: 'props.content' as BindPath,
        page: 'json',
        order: 0,
        meta: {
            chat: false,
            language: 'json',
            height: '300px',
        },
    },
];

export type JsonProviderSettings = {
    content: string;
};

export const DEFAULT_JSON_SETTINGS: JsonProviderSettings = {
    content: '[]',
};
