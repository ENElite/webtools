import type { SettingsSchema } from '@/components/settings';

import { PROVIDER_BIRD_SCHEMA, type BirdProviderSettings } from '@/providers/bird/schema';
import { PROVIDER_JSON_SCHEMA, type JsonProviderSettings } from '@/providers/json/schema';
import { PROVIDER_KONACHAN_SCHEMA, type KonachanProviderSettings } from '@/providers/konachan/schema';
import { Provider } from '@/providers';

export type SharedSettings = {
    objectFit: 'contain' | 'cover';
    provider: Provider;
    trackScale: number;
    trackIntensity: number;
    lockDock: boolean;
    interval: number;
    enableWakeLock: boolean;
    videoAutoSwitchOnEnded: boolean;
};

export const DEFAULT_SHARED_SETTINGS: SharedSettings = {
    objectFit: 'contain',
    provider: 'Konachan',
    trackScale: 100,
    trackIntensity: 0,
    lockDock: false,
    interval: 30,
    enableWakeLock: false,
    videoAutoSwitchOnEnded: true,
};

export type PaperSettingsValues = SharedSettings
    & KonachanProviderSettings
    & BirdProviderSettings
    & JsonProviderSettings;

export type PaperSettingsSnapshot = {
    sharedSettings: SharedSettings;
    konachanSettings: KonachanProviderSettings;
    birdSettings: BirdProviderSettings;
    jsonSettings: JsonProviderSettings;
};

const PAPER_SHARED_SETTINGS_SCHEMA: SettingsSchema<PaperSettingsValues> = [
    {
        key: 'objectFit',
        label: '覆盖窗口',
        type: 'enum',
        options: [
            { label: 'Contain', value: 'contain' },
            { label: 'Cover', value: 'cover' },
        ],
    },
    {
        key: 'provider',
        label: '来源',
        type: 'enum',
        options: [
            { label: 'Konachan', value: 'Konachan' },
            { label: '小鸟壁纸', value: 'BirdPaper' },
            { label: '配置文件', value: 'Json' },
        ],
    },
    {
        key: 'enableWakeLock',
        label: '不息屏',
        type: 'boolean',
    },
    {
        key: 'interval',
        label: '切换间隔',
        type: 'number',
        min: 5,
        max: 180,
        step: 1,
        suffix: '秒',
    },
    {
        key: 'trackScale',
        label: '图像缩放',
        type: 'number',
        min: 50,
        max: 150,
        step: 5,
        suffix: '%',
    },
    {
        key: 'trackIntensity',
        label: '跟踪强度',
        type: 'number',
        min: -100,
        max: 100,
        step: 5,
        suffix: '%',
    },
    {
        key: 'videoAutoSwitchOnEnded',
        label: '视频播完切换',
        type: 'boolean',
    },
];

export const PAPER_SETTINGS_SCHEMA: SettingsSchema<PaperSettingsValues> = [
    {
        type: 'divider',
        label: '共享设置',
    },
    ...PAPER_SHARED_SETTINGS_SCHEMA,
    {
        type: 'divider',
        label: 'Konachan 设置',
    },
    ...PROVIDER_KONACHAN_SCHEMA,
    {
        type: 'divider',
        label: 'BirdPaper 设置',
    },
    ...PROVIDER_BIRD_SCHEMA,
    {
        type: 'divider',
        label: 'Json 设置',
    },
    ...PROVIDER_JSON_SCHEMA,
];

export function buildPaperSettingsDraft(snapshot: PaperSettingsSnapshot): PaperSettingsValues {
    return {
        ...snapshot.sharedSettings,
        ...snapshot.konachanSettings,
        ...snapshot.birdSettings,
        ...snapshot.jsonSettings,
    };
}

export function splitPaperSettingsValues(values: PaperSettingsValues): PaperSettingsSnapshot {
    return {
        sharedSettings: {
            objectFit: values.objectFit,
            provider: values.provider,
            trackScale: values.trackScale,
            trackIntensity: values.trackIntensity,
            lockDock: values.lockDock,
            interval: values.interval,
            enableWakeLock: values.enableWakeLock,
            videoAutoSwitchOnEnded: values.videoAutoSwitchOnEnded,
        },
        konachanSettings: values,
        birdSettings: values,
        jsonSettings: values,
    };
}