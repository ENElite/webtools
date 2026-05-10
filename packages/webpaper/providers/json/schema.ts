import type { SettingsSchema } from '@/components/settings';

/**
 * Json Provider 的扁平化设置值
 */
export type JsonProviderSettingValues = {
    content: string;
};

/**
 * Json Provider 的 schema 定义
 */
export const PROVIDER_JSON_SCHEMA: SettingsSchema<JsonProviderSettingValues> = [
    {
        key: 'content',
        label: 'JSON 内容',
        type: 'editor',
        chat: false,
        language: 'json',
        height: '300px',
    },
];

export type JsonProviderSettings = {
    content: string;
};

export const DEFAULT_JSON_SETTINGS: JsonProviderSettings = {
    content: '[]',
};
